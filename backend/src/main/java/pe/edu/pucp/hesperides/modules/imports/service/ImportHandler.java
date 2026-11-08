package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.dto.ImportOutcome;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreview;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;

import java.util.Map;
import java.util.Set;

/**
 * Un tipo de carga por CSV (ejemplares, tachos, organizaciones…). Cada tipo
 * define solo sus reglas: columnas, validaciones, duplicados y escritura. El
 * controlador y el ciclo del lote ({@link ImportBatchGate}) son de todos.
 */
public interface ImportHandler {

    /** Los {@code kind} de la URL que atiende: {@code specimens}, {@code organizations}… */
    Set<String> kinds();

    ImportPreview preview(String kind, ImportUpload upload, String userEmail);

    /** {@code decisions}: por línea, si entra cada posible duplicado. Un tipo sin duplicados dudosos las ignora. */
    ImportOutcome confirm(Claimed claimed, Map<Integer, Boolean> decisions);
}
