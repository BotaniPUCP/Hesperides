package pe.edu.pucp.hesperides.modules.imports.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportConfirmationSummary;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportOutcome;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreview;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Lleva cada carga a quien sabe leer su estándar, según el tipo de la URL o del lote. */
@Service
public class ImportService {

    /** Tipos cuyo resultado queda en el lote: confirmar dos veces devuelve el mismo resultado. */
    private static final Set<String> RETRYABLE = Set.of("specimens", "species");

    private final Map<String, ImportHandler> byKind = new HashMap<>();
    private final ImportBatchGate gate;
    private final ImportLock lock;

    public ImportService(List<ImportHandler> handlers, ImportBatchGate gate, ImportLock lock) {
        this.gate = gate;
        this.lock = lock;
        handlers.forEach(h -> h.kinds().forEach(k -> byKind.put(k, h)));
    }

    /**
     * Vista previa y confirmación leen el ZIP entero en memoria (SPEC-104 D-10). El
     * ZIP llega como proveedor para leerlo recién con el permiso: una segunda carga
     * se rechaza sin haber ocupado sus 250 MB.
     */
    public ImportPreview preview(String kind, ImportUpload upload, String userEmail) {
        return preview(kind, upload, Map.of(), userEmail);
    }

    public ImportPreview preview(String kind, ImportUpload upload, Map<String, String> speciesBindings, String userEmail) {
        return lock.run(() -> handler(kind).previewWithBindings(kind, upload, orEmpty(speciesBindings), userEmail));
    }

    public ImportOutcome confirm(long batchId, Map<Integer, Boolean> decisions, String userEmail) {
        return confirm(batchId, decisions, null, userEmail);
    }

    /** Los ejemplares se confirman contra el resumen que vio el usuario: su huella es obligatoria. */
    public ImportOutcome confirm(long batchId, Map<Integer, Boolean> decisions, String summaryFingerprint,
                                 String userEmail) {
        return lock.run(() -> {
            Optional<ImportResultResponse> completed = gate.confirmedResult(batchId, userEmail, RETRYABLE);
            if (completed.isPresent()) return completed.get();
            Claimed claimed = gate.claim(batchId, userEmail);
            if ("specimens".equals(claimed.batch().kind())
                    && (summaryFingerprint == null || summaryFingerprint.isBlank())) {
                throw new ValidationException("A confirmation summary is required before importing specimens");
            }
            if (summaryFingerprint != null) {
                ImportFingerprints.verifyConfirmationFingerprint(claimed.batch(), decisions, summaryFingerprint);
            }
            return handler(claimed.batch().kind()).confirm(claimed, orEmpty(decisions));
        });
    }

    public ImportConfirmationSummary confirmationSummary(long batchId, Map<Integer, Boolean> decisions,
                                                         String planFingerprint, String userEmail) {
        return lock.run(() -> {
            Claimed claimed = gate.claim(batchId, userEmail);
            ImportFingerprints.verifyPlanFingerprint(claimed.batch(), planFingerprint);
            return handler(claimed.batch().kind()).confirmationSummary(claimed, orEmpty(decisions));
        });
    }

    public ImportPreview reanalyze(long batchId, ImportUpload upload, Map<String, String> speciesBindings,
                                   String userEmail) {
        return lock.run(() -> {
            Claimed claimed = gate.claim(batchId, userEmail);
            return handler(claimed.batch().kind()).reanalyze(claimed, upload, orEmpty(speciesBindings));
        });
    }

    private static <K, V> Map<K, V> orEmpty(Map<K, V> map) {
        return map == null ? Map.of() : map;
    }

    private ImportHandler handler(String kind) {
        ImportHandler h = byKind.get(kind);
        if (h == null) {
            throw new ResourceNotFoundException("There is no CSV standard for: " + kind);
        }
        return h;
    }
}
