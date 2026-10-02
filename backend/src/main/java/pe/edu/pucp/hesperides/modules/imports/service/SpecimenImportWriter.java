package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenWriter;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Confirma una carga de ejemplares. Las fotos se guardan antes, fuera de la
 * transacción; después todas las filas se escriben en una sola transacción.
 */
@Component
@RequiredArgsConstructor
class SpecimenImportWriter {

    private final SpecimenWriter writer;
    private final PhotoRepository photos;
    private final ImportPhotos importPhotos;
    private final ImportBatchGate gate;
    private final SpecimenLookupRepository lookup;
    private final TransactionTemplate transaction;

    ImportResultResponse write(long batchId, SpecimenPreview preview, List<PlannedRow> rows, long userId) {
        List<ImportPreviewResponse.Issue> warnings = new ArrayList<>();
        List<ImportPhotos.Request> requests = rows.stream()
                .filter(r -> r.draft().photo() != null && !alreadyHas(r))
                .map(r -> new ImportPhotos.Request(r.line(), r.draft().photo())).toList();
        Map<String, byte[]> zip = gate.zip(batchId, ImportPhotos.needsZip(requests));
        Map<Integer, StoredPhoto> stored = importPhotos.store("green-elements/import-" + batchId, requests, zip, warnings);
        return transaction.execute(status -> {
            List<String> created = new ArrayList<>();
            int updated = 0;
            for (PlannedRow row : rows) {
                SpecimenWriter.Written w = writer.write(row, batchId, userId, null);
                StoredPhoto photo = stored.get(row.line());
                if (photo != null) {
                    photos.insertElementPhoto(w.id(), photo, PhotoFiles.name(row.draft().photo()),
                            ImportPhotos.sourceLink(row.draft().photo()), userId);
                }
                if (row.action() == ImportAction.CREATE) created.add(w.code());
                else updated++;
            }
            ImportResultResponse r = new ImportResultResponse(batchId, created.size(), updated,
                    ImportBatchGate.omitted(preview.rows(), rows),
                    preview.unknownSpecies().stream()
                            .map(s -> new ImportPreviewResponse.UnknownSpecies(s.name(), s.rows())).toList(),
                    warnings, created);
            gate.close(batchId, r);
            return r;
        });
    }

    /** Exportar y volver a cargar trae el mismo enlace: la foto ya es suya y no se duplica. */
    private boolean alreadyHas(PlannedRow row) {
        String link = ImportPhotos.sourceLink(row.draft().photo());
        return row.action() == ImportAction.UPDATE && link != null && lookup.hasPhotoFrom(row.draft().code(), link);
    }
}
