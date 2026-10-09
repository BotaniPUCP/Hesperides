package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.ImportRules;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * El ciclo de un lote de carga, igual para todo tipo (SPEC-103 D-04): se abre
 * con la vista previa, solo quien lo abrió lo confirma dentro de la hora, y se
 * cierra con el resultado.
 */
@Component
@RequiredArgsConstructor
public class ImportBatchGate {

    public record Opened(long batchId, LocalDateTime expiresAt) {
    }

    public record Claimed(Batch batch, long userId) {
    }

    private final ImportBatchRepository batches;
    private final SpecimenLookupRepository lookup;
    private final FileStorage storage;
    private final ObjectMapper json;

    public Opened open(String kind, String fileName, String userEmail, Object preview, byte[] zip) {
        LocalDateTime expires = LocalDateTime.now().plusMinutes(ImportRules.PREVIEW_MINUTES);
        long id = batches.create(kind, fileName, lookup.userId(userEmail), json.writeValueAsString(preview), expires);
        if (zip != null) {
            // El ZIP espera a la confirmación en el almacenamiento, no en la base.
            storage.put(zipKey(id), zip, "application/zip");
        }
        return new Opened(id, expires);
    }

    public Claimed claim(long batchId, String userEmail) {
        Batch batch = batches.find(batchId).orElseThrow(() -> new ResourceNotFoundException("Import not found: " + batchId));
        long userId = lookup.userId(userEmail);
        if (!"PREVIEWED".equals(batch.status())) {
            throw new BusinessRuleException("This import was already confirmed or expired");
        }
        if (batch.createdBy() != userId) {
            throw new BusinessRuleException("Only who uploaded the file can confirm it");
        }
        if (batch.expiresAt().isBefore(LocalDateTime.now())) {
            batches.expire(batch.id());
            throw new BusinessRuleException("The preview expired: upload the file again");
        }
        return new Claimed(batch, userId);
    }

    public <T> T report(Batch batch, Class<T> type) {
        return json.readValue(batch.report(), type);
    }

    public Map<String, byte[]> zip(long batchId, boolean needed) {
        return needed ? PhotoFiles.read(storage.read(zipKey(batchId))) : Map.of();
    }

    public void close(long batchId, Object result) {
        batches.confirm(batchId, json.writeValueAsString(result));
    }

    /** Cada posible duplicado necesita su decisión: ninguno entra ni se pierde por defecto. */
    public static <T extends PlannedLine> List<T> include(List<T> rows, Map<Integer, Boolean> decisions) {
        List<Integer> undecided = rows.stream().filter(PlannedLine::isPossibleDuplicate)
                .map(PlannedLine::line).filter(line -> !decisions.containsKey(line)).toList();
        if (!undecided.isEmpty()) {
            throw new ValidationException("Decide on the possible duplicates at lines " + undecided);
        }
        return rows.stream().filter(r -> !r.isPossibleDuplicate() || decisions.get(r.line())).toList();
    }

    public static int omitted(List<? extends PlannedLine> planned, List<? extends PlannedLine> included) {
        return (int) (planned.stream().filter(PlannedLine::isPossibleDuplicate).count()
                - included.stream().filter(PlannedLine::isPossibleDuplicate).count());
    }

    static String zipKey(long batchId) {
        return "imports/" + batchId + "/photos.zip";
    }
}
