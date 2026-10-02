package pe.edu.pucp.hesperides.modules.imports.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/** Lleva cada carga a quien sabe leer su estándar, según el tipo de la URL o del lote. */
@Service
public class ImportService {

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
    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, Supplier<byte[]> zip, String userEmail) {
        return lock.run(() -> handler(kind).preview(kind, csv, fileName, zip.get(), userEmail));
    }

    public ImportResultResponse confirm(long batchId, Map<Integer, Boolean> decisions, String userEmail) {
        return lock.run(() -> {
            Claimed claimed = gate.claim(batchId, userEmail);
            return handler(claimed.batch().kind()).confirm(claimed, decisions);
        });
    }

    private ImportHandler handler(String kind) {
        ImportHandler h = byKind.get(kind);
        if (h == null) {
            throw new ResourceNotFoundException("There is no CSV standard for: " + kind);
        }
        return h;
    }
}
