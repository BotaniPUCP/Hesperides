package pe.edu.pucp.hesperides.modules.imports.dto;

import java.util.List;

/**
 * El resumen de una carga confirmada. Las especies no ingresadas se listan con
 * su cantidad (SPEC-103 D-04); una foto que no se pudo descargar no impidió
 * guardar su fila.
 */
public record ImportResultResponse(long batchId, int created, int updated, int omittedDuplicates,
                                   List<ImportPreviewResponse.UnknownSpecies> unknownSpecies,
                                   List<ImportPreviewResponse.Issue> photoWarnings, List<String> createdCodes) {
}
