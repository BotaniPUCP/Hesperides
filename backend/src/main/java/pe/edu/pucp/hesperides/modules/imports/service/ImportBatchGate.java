package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.ImportRules;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.persistence.UserIds;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * El ciclo de un lote de carga, igual para todo tipo (SPEC-103 D-04): se abre
 * con la vista previa, solo quien lo abrió lo confirma dentro de la hora, y se
 * cierra con el resultado. El ZIP de fotos vive aparte, en {@link BatchPhotoZips}.
 */
@Component
@RequiredArgsConstructor
public class ImportBatchGate {

    /** {@code planFingerprint}: solo en las cargas que confirman contra un resumen (ejemplares). */
    public record Opened(long batchId, LocalDateTime expiresAt, String planFingerprint) {
        public Opened(long batchId, LocalDateTime expiresAt) {
            this(batchId, expiresAt, null);
        }
    }

    public record Claimed(Batch batch, long userId) {
    }

    private static final String SPECIMENS = "specimens";

    private final ImportBatchRepository batches;
    private final UserIds users;
    private final ObjectMapper json;

    public Opened open(String kind, String fileName, String userEmail, Object preview) {
        LocalDateTime expires = LocalDateTime.now().plusMinutes(ImportRules.PREVIEW_MINUTES);
        String report = json.writeValueAsString(revisionedPreview(kind, preview));
        long id = batches.create(kind, fileName, users.of(userEmail), report, expires);
        return new Opened(id, expires, SPECIMENS.equals(kind) ? persistedFingerprint(id) : null);
    }

    /** Guarda un plan re-analizado en el mismo lote pendiente. */
    public Opened replacePreview(Claimed claimed, Object preview) {
        long batchId = claimed.batch().id();
        String report = json.writeValueAsString(revisionedPreview(claimed.batch().kind(), preview));
        if (!batches.replacePreview(batchId, claimed.userId(), claimed.batch().report(), report)) {
            throw new BusinessRuleException("The preview changed or expired. Upload the file again");
        }
        return new Opened(batchId, claimed.batch().expiresAt(), persistedFingerprint(batchId));
    }

    /** La huella se toma del informe como quedó guardado (jsonb lo normaliza), no del que se envió. */
    private String persistedFingerprint(long batchId) {
        String report = batches.find(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Import not found: " + batchId)).report();
        return ImportFingerprints.planFingerprint(batchId, report);
    }

    /** Aun un re-análisis idéntico es un plan nuevo e invalida los diálogos de confirmación anteriores. */
    private static Object revisionedPreview(String kind, Object preview) {
        return SPECIMENS.equals(kind) && preview instanceof SpecimenPreview specimens
                ? specimens.withPlanRevision(UUID.randomUUID().toString())
                : preview;
    }

    public Claimed claim(long batchId, String userEmail) {
        Batch batch = batches.find(batchId).orElseThrow(() -> new ResourceNotFoundException("Import not found: " + batchId));
        long userId = users.of(userEmail);
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

    /**
     * Reintento de confirmación en los tipos que guardan su resultado en el lote: solo quien
     * subió el archivo lo recupera; los demás tipos siguen como antes.
     */
    public Optional<ImportResultResponse> confirmedResult(long batchId, String userEmail, Set<String> retryableKinds) {
        Batch batch = batches.find(batchId).orElse(null);
        if (batch == null || !"CONFIRMED".equals(batch.status()) || !retryableKinds.contains(batch.kind())) {
            return Optional.empty();
        }
        long userId = users.of(userEmail);
        if (batch.createdBy() != userId) {
            throw new BusinessRuleException("Only who uploaded the file can confirm it");
        }
        return batches.confirmedResultJson(batchId, userId).map(result -> json.readValue(result, ImportResultResponse.class));
    }

    public <T> T report(Batch batch, Class<T> type) {
        return json.readValue(batch.report(), type);
    }

    /** Para un informe genérico, como el de cada tipo del Directorio. */
    public <T> T report(Batch batch, TypeReference<T> type) {
        return json.readValue(batch.report(), type);
    }

    public void close(long batchId, Object result) {
        batches.confirm(batchId, json.writeValueAsString(result));
    }

    /** Vuelve a revisar y bloquea la vista previa exacta antes de escribir un lote de alta integridad. */
    public void lockForConfirmation(Claimed claimed) {
        Batch current = batches.findForUpdate(claimed.batch().id())
                .orElseThrow(() -> new ResourceNotFoundException("Import not found: " + claimed.batch().id()));
        if (!"PREVIEWED".equals(current.status()) || current.createdBy() != claimed.userId()
                || current.expiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException("This preview is no longer available. Re-analyze the file");
        }
        if (!current.report().equals(claimed.batch().report())) {
            throw new BusinessRuleException("This preview changed. Re-analyze the file before confirming");
        }
    }

    public void closeExclusive(long batchId, Object result) {
        if (!batches.confirmExclusive(batchId, json.writeValueAsString(result))) {
            throw new BusinessRuleException("This import was already confirmed or expired");
        }
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
}
