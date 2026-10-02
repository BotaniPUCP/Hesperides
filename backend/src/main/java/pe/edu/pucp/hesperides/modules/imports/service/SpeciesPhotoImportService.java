package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.speciesphotos.SpeciesPhotoPreview;
import pe.edu.pucp.hesperides.modules.imports.speciesphotos.SpeciesPhotoPreview.Planned;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Carga de fotos genéricas de especie (SPEC-103 §6.5): cada fila reemplaza la foto de su especie. */
@Service
@RequiredArgsConstructor
public class SpeciesPhotoImportService implements ImportHandler {

    static final String KIND = "species-photos";

    private final SpecimenLookupRepository lookup;
    private final ImportBatchGate gate;
    private final ImportPhotos photos;
    private final PhotoRepository repository;
    private final TransactionTemplate transaction;

    @Override
    public Set<String> kinds() {
        return Set.of(KIND);
    }

    @Override
    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail) {
        Map<String, byte[]> zipFiles = zip == null ? Map.of() : PhotoFiles.read(zip);
        SpeciesPhotoPreview p = SpeciesPhotoPreview.of(CsvTable.parse(csv), lookup.speciesByName(), Set.copyOf(zipFiles.keySet()));
        Opened opened = gate.open(KIND, fileName, userEmail, p, zip);
        int unknownRows = p.unknownSpecies().stream().mapToInt(s -> s.rows()).sum();
        return new ImportPreviewResponse(opened.batchId(), KIND, p.rows().size() + unknownRows, 0, p.rows().size(),
                p.unknownSpecies().stream().map(s -> new ImportPreviewResponse.UnknownSpecies(s.name(), s.rows())).toList(),
                List.of(), p.issues().stream().map(i -> new ImportPreviewResponse.Issue(i.line(), i.column(), i.message())).toList(),
                false, p.canConfirm(), opened.expiresAt());
    }

    @Override
    public ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        long batchId = claimed.batch().id();
        SpeciesPhotoPreview p = gate.report(claimed.batch(), SpeciesPhotoPreview.class);
        if (!p.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<ImportPreviewResponse.Issue> warnings = new ArrayList<>();
        List<ImportPhotos.Request> requests = p.rows().stream().map(r -> new ImportPhotos.Request(r.line(), r.photo())).toList();
        Map<Integer, StoredPhoto> stored = photos.store("species/import-" + batchId, requests,
                gate.zip(batchId, ImportPhotos.needsZip(requests)), warnings);
        return transaction.execute(status -> {
            int saved = 0;
            for (Planned row : p.rows()) {
                StoredPhoto photo = stored.get(row.line());
                if (photo == null) continue;
                repository.replaceSpeciesPhoto(row.speciesId(), photo, ImportPhotos.sourceLink(row.photo()), claimed.userId());
                saved++;
            }
            ImportResultResponse result = new ImportResultResponse(batchId, 0, saved, 0,
                    p.unknownSpecies().stream().map(s -> new ImportPreviewResponse.UnknownSpecies(s.name(), s.rows())).toList(),
                    warnings, List.of());
            gate.close(batchId, result);
            return result;
        });
    }
}
