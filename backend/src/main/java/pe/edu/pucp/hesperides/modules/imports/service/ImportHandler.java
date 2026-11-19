package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.dto.ImportConfirmationSummary;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportOutcome;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreview;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

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

    /**
     * Vista previa con la especie que el usuario eligió para cada nombre del CSV (ejemplares).
     * Los tipos que no la usan la ignoran.
     */
    default ImportPreview previewWithBindings(String kind, ImportUpload upload, Map<String, String> speciesBindings,
                                              String userEmail) {
        return preview(kind, upload, userEmail);
    }

    /** Vuelve a analizar el archivo en el mismo lote pendiente; solo los tipos que lo permiten. */
    default ImportPreview reanalyze(Claimed claimed, ImportUpload upload, Map<String, String> speciesBindings) {
        throw new BusinessRuleException("This import type cannot be re-analyzed");
    }

    /** {@code decisions}: por línea, si entra cada posible duplicado. Un tipo sin duplicados dudosos las ignora. */
    ImportOutcome confirm(Claimed claimed, Map<Integer, Boolean> decisions);

    /** Resumen de solo lectura antes de confirmar; solo los tipos que lo necesitan. */
    default ImportConfirmationSummary confirmationSummary(Claimed claimed, Map<Integer, Boolean> decisions) {
        throw new BusinessRuleException("This import type does not provide a confirmation summary");
    }
}
