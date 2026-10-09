package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureKind;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview.PlannedFeature;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureResolver;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureWriter;
import pe.edu.pucp.hesperides.modules.imports.repository.FeatureLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Carga de tachos y bebederos por CSV (SPEC-103 §6.3 y §6.4), con el mismo ciclo que la de ejemplares. */
@Service
@RequiredArgsConstructor
public class FeatureImportService implements ImportHandler {

    private final FeatureLookupRepository lookup;
    private final FeatureResolver resolver;
    private final FeatureWriter writer;
    private final ImportBatchGate gate;
    private final ImportPhotos photos;
    private final TransactionTemplate transaction;

    @Override
    public Set<String> kinds() {
        return Arrays.stream(FeatureKind.values()).map(FeatureKind::kind).collect(Collectors.toSet());
    }

    @Override
    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail) {
        FeatureKind k = FeatureKind.of(kind).orElseThrow(() -> new ResourceNotFoundException("There is no CSV standard for: " + kind));
        Map<String, byte[]> zipFiles = zip == null ? Map.of() : PhotoFiles.read(zip);
        FeatureCsvSchema.Parsed parsed = FeatureCsvSchema.parse(CsvTable.parse(csv), k, lookup.vocabulary());
        FeaturePreview preview = resolver.resolve(k, parsed, Set.copyOf(zipFiles.keySet()));
        Opened opened = gate.open(kind, fileName, userEmail, preview, zip);
        return PreviewMapper.toResponse(opened.batchId(), kind, preview, opened.expiresAt());
    }

    @Override
    public ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        long batchId = claimed.batch().id();
        FeaturePreview preview = gate.report(claimed.batch(), FeaturePreview.class);
        if (!preview.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<PlannedFeature> rows = ImportBatchGate.include(preview.rows(), decisions);
        List<ImportPreviewResponse.Issue> warnings = new ArrayList<>();
        List<ImportPhotos.Request> requests = rows.stream().filter(r -> r.draft().photo() != null)
                .map(r -> new ImportPhotos.Request(r.line(), r.draft().photo())).toList();
        Map<Integer, StoredPhoto> stored = photos.store("campus-features/import-" + batchId, requests,
                gate.zip(batchId, ImportPhotos.needsZip(requests)), warnings);
        return transaction.execute(status -> write(batchId, preview, rows, stored, warnings, claimed.userId()));
    }

    private ImportResultResponse write(long batchId, FeaturePreview preview, List<PlannedFeature> rows,
                                       Map<Integer, StoredPhoto> stored, List<ImportPreviewResponse.Issue> warnings, long userId) {
        List<String> created = new ArrayList<>();
        int updated = 0;
        for (PlannedFeature row : rows) {
            FeatureWriter.Written w = writer.write(preview.kind(), row, batchId);
            StoredPhoto photo = stored.get(row.line());
            if (photo != null) {
                writer.attachPhoto(w.id(), photo, PhotoFiles.name(row.draft().photo()),
                        ImportPhotos.sourceLink(row.draft().photo()), userId);
            }
            if (row.action() == ImportAction.CREATE) created.add(w.code());
            else updated++;
        }
        ImportResultResponse result = new ImportResultResponse(batchId, created.size(), updated,
                ImportBatchGate.omitted(preview.rows(), rows), List.of(), warnings, created);
        gate.close(batchId, result);
        return result;
    }
}
