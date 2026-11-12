package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.ImportRules;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * El ciclo de un lote de carga, igual para todo tipo (SPEC-103 D-04): se abre
 * con la vista previa, solo quien lo abrió lo confirma dentro de la hora, y se
 * cierra con el resultado.
 */
@Component
@RequiredArgsConstructor
public class ImportBatchGate {

    public record Opened(long batchId, LocalDateTime expiresAt, String planFingerprint) {
        public Opened(long batchId, LocalDateTime expiresAt) {
            this(batchId, expiresAt, null);
        }
    }

    public record Claimed(Batch batch, long userId) {
    }

    private final ImportBatchRepository batches;
    private final SpecimenLookupRepository lookup;
    private final FileStorage storage;
    private final ObjectMapper json;

    public Opened open(String kind, String fileName, String userEmail, Object preview, byte[] zip) {
        LocalDateTime expires = LocalDateTime.now().plusMinutes(ImportRules.PREVIEW_MINUTES);
        Object savedPreview = revisionedPreview(kind, preview);
        String report = json.writeValueAsString(savedPreview);
        long id = batches.create(kind, fileName, lookup.userId(userEmail), report, expires);
        String fingerprint = null;
        if ("specimens".equals(kind)) {
            String persistedReport = batches.find(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Import not found: " + id)).report();
            fingerprint = planFingerprint(id, persistedReport);
        }
        if (zip != null) {
            // El ZIP espera a la confirmación en el almacenamiento, no en la base.
            storage.put(zipKey(id), zip, "application/zip");
        }
        return new Opened(id, expires, fingerprint);
    }

    /** Save a re-analyzed plan in the same pending batch. */
    public Opened replacePreview(Claimed claimed, Object preview, byte[] zip) {
        long batchId = claimed.batch().id();
        if (zip != null) {
            storage.put(zipKey(batchId), zip, "application/zip");
        }
        Object savedPreview = revisionedPreview(claimed.batch().kind(), preview);
        String report = json.writeValueAsString(savedPreview);
        if (!batches.replacePreview(batchId, claimed.userId(), claimed.batch().report(), report)) {
            throw new BusinessRuleException("The preview changed or expired. Upload the file again");
        }
        String persistedReport = batches.find(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Import not found: " + batchId)).report();
        return new Opened(batchId, claimed.batch().expiresAt(), planFingerprint(batchId, persistedReport));
    }

    /** Even an identical re-analysis is a new saved plan and invalidates old confirmation dialogs. */
    private static Object revisionedPreview(String kind, Object preview) {
        return "specimens".equals(kind) && preview instanceof SpecimenPreview specimens
                ? specimens.withPlanRevision(UUID.randomUUID().toString())
                : preview;
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

    /** Binds the confirmation dialog to the saved plan and the exact duplicate decisions. */
    public static String confirmationFingerprint(Batch batch, Map<Integer, Boolean> decisions) {
        Map<Integer, Boolean> ordered = new TreeMap<>(decisions == null ? Map.of() : decisions);
        String decisionText = ordered.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        String value = planFingerprint(batch.id(), batch.report()) + "\n" + decisionText;
        return sha256(value);
    }

    public static String planFingerprint(long batchId, String report) {
        return sha256(batchId + "\n" + report);
    }

    public static void verifyPlanFingerprint(Batch batch, String expected) {
        if (expected == null || !MessageDigest.isEqual(
                planFingerprint(batch.id(), batch.report()).getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessRuleException("This preview changed. Re-analyze the file before confirming");
        }
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    public static void verifyConfirmationFingerprint(Batch batch, Map<Integer, Boolean> decisions, String expected) {
        if (expected == null || !MessageDigest.isEqual(
                confirmationFingerprint(batch, decisions).getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessRuleException("This preview changed. Re-analyze the file before confirming");
        }
    }

    /**
     * Confirmation retry for import kinds whose result is persisted in the batch.
     * Only the original uploader can recover it; other kinds keep their prior behavior.
     */
    public Optional<ImportResultResponse> confirmedResult(long batchId, String userEmail, Set<String> retryableKinds) {
        Batch batch = batches.find(batchId).orElse(null);
        if (batch == null || !"CONFIRMED".equals(batch.status()) || !retryableKinds.contains(batch.kind())) {
            return Optional.empty();
        }
        long userId = lookup.userId(userEmail);
        if (batch.createdBy() != userId) {
            throw new BusinessRuleException("Only who uploaded the file can confirm it");
        }
        return batches.confirmedResultJson(batchId, userId).map(result -> json.readValue(result, ImportResultResponse.class));
    }

    public <T> T report(Batch batch, Class<T> type) {
        return json.readValue(batch.report(), type);
    }

    public Map<String, byte[]> zip(long batchId, boolean needed) {
        return needed ? PhotoFiles.read(storage.read(zipKey(batchId))) : Map.of();
    }

    /** Strictly reads ZIPs attached to mass registration of specimens or species. */
    public Map<String, byte[]> registrationZip(long batchId, boolean needed) {
        return needed ? PhotoFiles.readStrict(storage.read(zipKey(batchId))) : Map.of();
    }

    public void close(long batchId, Object result) {
        batches.confirm(batchId, json.writeValueAsString(result));
    }

    /** Recheck and lock the exact preview before writing a high-integrity bulk batch. */
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

    static String zipKey(long batchId) {
        return "imports/" + batchId + "/photos.zip";
    }
}
