package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenWriter;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoDownloader;
import pe.edu.pucp.hesperides.shared.storage.PhotoNotDownloadedException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Confirma una carga. Las fotos se descargan y guardan antes, fuera de la
 * transacción, para que no espere a la red (SPEC-103 §3.1); después todas las
 * filas se escriben en una sola transacción.
 */
@Component
@RequiredArgsConstructor
class SpecimenImportWriter {

    private final SpecimenWriter writer;
    private final PhotoRepository photos;
    private final PhotoStore store;
    private final PhotoDownloader downloader;
    private final ImportBatchRepository batches;
    private final SpecimenLookupRepository lookup;
    private final TransactionTemplate transaction;
    private final ObjectMapper json;

    ImportResultResponse write(long batchId, SpecimenPreview preview, List<PlannedRow> rows, Map<String, byte[]> zip,
                               long userId) {
        List<ImportPreviewResponse.Issue> warnings = new ArrayList<>();
        Map<Integer, StoredPhoto> stored = storePhotos(batchId, rows, zip, warnings);
        ImportResultResponse result = transaction.execute(status -> {
            List<String> created = new ArrayList<>();
            int updated = 0;
            for (PlannedRow row : rows) {
                SpecimenWriter.Written w = writer.write(row, batchId, userId, null);
                StoredPhoto photo = stored.get(row.draft().line());
                if (photo != null) {
                    photos.insertElementPhoto(w.id(), photo, PhotoFiles.name(row.draft().photo()), link(row), userId);
                }
                if (row.action() == SpecimenPreview.Action.CREATE) created.add(w.code());
                else updated++;
            }
            ImportResultResponse r = new ImportResultResponse(batchId, created.size(), updated,
                    (int) preview.rows().stream().filter(PlannedRow::isPossibleDuplicate).count()
                            - (int) rows.stream().filter(PlannedRow::isPossibleDuplicate).count(),
                    preview.unknownSpecies().stream()
                            .map(s -> new ImportPreviewResponse.UnknownSpecies(s.name(), s.rows())).toList(),
                    warnings, created);
            batches.confirm(batchId, json.writeValueAsString(r));
            return r;
        });
        return result;
    }

    /** Una foto que no se puede traer no impide guardar la fila: se avisa. */
    private Map<Integer, StoredPhoto> storePhotos(long batchId, List<PlannedRow> rows, Map<String, byte[]> zip,
                                                  List<ImportPreviewResponse.Issue> warnings) {
        Map<Integer, StoredPhoto> out = new HashMap<>();
        for (PlannedRow row : rows) {
            String photo = row.draft().photo();
            if (photo == null || alreadyHas(row)) continue;
            try {
                byte[] bytes = photo.startsWith("http") ? downloader.download(photo) : zip.get(PhotoFiles.name(photo));
                out.put(row.draft().line(), store.save("green-elements/import-" + batchId, bytes));
            } catch (PhotoNotDownloadedException | ValidationException e) {
                warnings.add(new ImportPreviewResponse.Issue(row.draft().line(), "foto", "Photo not saved: " + e.getMessage()));
            }
        }
        return out;
    }

    private boolean alreadyHas(PlannedRow row) {
        String link = link(row);
        return row.action() == SpecimenPreview.Action.UPDATE && link != null
                && lookup.hasPhotoFrom(row.draft().code(), link);
    }

    private static String link(PlannedRow row) {
        String photo = row.draft().photo();
        return photo != null && photo.startsWith("http") ? photo : null;
    }
}
