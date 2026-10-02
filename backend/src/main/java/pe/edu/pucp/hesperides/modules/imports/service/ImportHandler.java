package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;

import java.util.Map;
import java.util.Set;

/**
 * Un tipo de carga por CSV (ejemplares, tachos, bebederos…). Un estándar nuevo
 * es una implementación nueva: el controlador y el ciclo del lote no cambian.
 */
public interface ImportHandler {

    /** Los {@code kind} de la URL que atiende: {@code specimens}, {@code waste-bins}… */
    Set<String> kinds();

    ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail);

    ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions);
}
