package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenResolver;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Carga de ejemplares por CSV en dos pasos (SPEC-103 D-04): la vista previa no
 * escribe nada y se guarda; la confirmación escribe exactamente lo previsto.
 */
@Service
@RequiredArgsConstructor
public class SpecimenImportService {

    static final String KIND = "specimens";
    /** Una vista previa vieja ya no describe la base: se confirma dentro de la hora. */
    private static final long PREVIEW_MINUTES = 60;

    private final SpecimenResolver resolver;
    private final SpecimenLookupRepository lookup;
    private final ImportBatchRepository batches;
    private final FileStorage storage;
    private final SpecimenImportWriter writer;
    private final ObjectMapper json;

    public ImportPreviewResponse preview(byte[] csv, String fileName, byte[] zip, String userEmail) {
        Map<String, byte[]> photos = zip == null ? Map.of() : PhotoFiles.read(zip);
        SpecimenPreview preview = resolver.resolve(SpecimenCsvSchema.parse(CsvTable.parse(csv)), Set.copyOf(photos.keySet()));
        LocalDateTime expires = LocalDateTime.now().plusMinutes(PREVIEW_MINUTES);
        long batchId = batches.create(KIND, fileName, lookup.userId(userEmail), json.writeValueAsString(preview), expires);
        if (zip != null) {
            // El ZIP espera a la confirmación en el almacenamiento, no en la base.
            storage.put(zipKey(batchId), zip, "application/zip");
        }
        return PreviewMapper.toResponse(batchId, KIND, preview, expires);
    }

    public ImportResultResponse confirm(long batchId, Map<Integer, Boolean> decisions, String userEmail) {
        Batch batch = batches.find(batchId).orElseThrow(() -> new ResourceNotFoundException("Import not found: " + batchId));
        long userId = lookup.userId(userEmail);
        requireConfirmable(batch, userId);
        SpecimenPreview preview = json.readValue(batch.report(), SpecimenPreview.class);
        if (!preview.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<PlannedRow> included = include(preview.rows(), decisions);
        Map<String, byte[]> zip = preview.rows().stream().anyMatch(r -> isZipPhoto(r.draft().photo()))
                ? PhotoFiles.read(storage.read(zipKey(batchId))) : Map.of();
        return writer.write(batchId, preview, included, zip, userId);
    }

    private void requireConfirmable(Batch batch, long userId) {
        if (!KIND.equals(batch.kind()) || !"PREVIEWED".equals(batch.status())) {
            throw new BusinessRuleException("This import was already confirmed or expired");
        }
        if (batch.createdBy() != userId) {
            throw new BusinessRuleException("Only who uploaded the file can confirm it");
        }
        if (batch.expiresAt().isBefore(LocalDateTime.now())) {
            batches.expire(batch.id());
            throw new BusinessRuleException("The preview expired: upload the file again");
        }
    }

    /** Cada posible duplicado necesita su decisión: ninguno entra ni se pierde por defecto. */
    private static List<PlannedRow> include(List<PlannedRow> rows, Map<Integer, Boolean> decisions) {
        List<Integer> undecided = rows.stream().filter(PlannedRow::isPossibleDuplicate)
                .map(r -> r.draft().line()).filter(line -> !decisions.containsKey(line)).toList();
        if (!undecided.isEmpty()) {
            throw new ValidationException("Decide on the possible duplicates at lines " + undecided);
        }
        return rows.stream().filter(r -> !r.isPossibleDuplicate() || decisions.get(r.draft().line())).toList();
    }

    private static boolean isZipPhoto(String photo) {
        return photo != null && !photo.startsWith("http");
    }

    static String zipKey(long batchId) {
        return "imports/" + batchId + "/photos.zip";
    }
}
