package pe.edu.pucp.hesperides.modules.imports.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Lleva cada carga a quien sabe leer su estándar, según el tipo de la URL o del lote. */
@Service
public class ImportService {

    private final Map<String, ImportHandler> byKind = new HashMap<>();
    private final ImportBatchGate gate;

    public ImportService(List<ImportHandler> handlers, ImportBatchGate gate) {
        this.gate = gate;
        handlers.forEach(h -> h.kinds().forEach(k -> byKind.put(k, h)));
    }

    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail) {
        return handler(kind).preview(kind, csv, fileName, zip, userEmail);
    }

    public ImportResultResponse confirm(long batchId, Map<Integer, Boolean> decisions, String userEmail) {
        Claimed claimed = gate.claim(batchId, userEmail);
        return handler(claimed.batch().kind()).confirm(claimed, decisions);
    }

    private ImportHandler handler(String kind) {
        ImportHandler h = byKind.get(kind);
        if (h == null) {
            throw new ResourceNotFoundException("There is no CSV standard for: " + kind);
        }
        return h;
    }
}
