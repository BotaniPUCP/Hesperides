package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportConfirmationSummary;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;

import java.util.Map;
import java.util.Set;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

/**
 * Un tipo de carga por CSV (ejemplares, tachos, bebederos…). Un estándar nuevo
 * es una implementación nueva: el controlador y el ciclo del lote no cambian.
 */
public interface ImportHandler {

    /** Los {@code kind} de la URL que atiende: {@code specimens}, {@code waste-bins}… */
    Set<String> kinds();

    ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail);

    /** Optional batch-local bindings used by specimen import when recovering a preview. */
    default ImportPreviewResponse previewWithBindings(String kind, byte[] csv, String fileName, byte[] zip,
                                                       Map<String, String> speciesBindings, String userEmail) {
        return preview(kind, csv, fileName, zip, userEmail);
    }

    default ImportPreviewResponse reanalyze(Claimed claimed, byte[] csv, String fileName, byte[] zip,
                                           Map<String, String> speciesBindings) {
        throw new BusinessRuleException("This import type cannot be re-analyzed");
    }

    ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions);

    /** Read-only confirmation summary. Only import kinds that need one override this. */
    default ImportConfirmationSummary confirmationSummary(Claimed claimed, Map<Integer, Boolean> decisions) {
        throw new BusinessRuleException("This import type does not provide a confirmation summary");
    }
}
