package pe.edu.pucp.hesperides.modules.imports.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lo que la persona revisa antes de confirmar una carga (SPEC-103 §5.2).
 * Mientras {@code issues} tenga algo, {@code canConfirm} es falso.
 */
public record ImportPreviewResponse(long batchId, String kind, int totalRows, int toCreate, int toUpdate,
                                    List<UnknownSpecies> unknownSpecies, List<Duplicate> duplicates,
                                    List<Issue> issues, boolean decimalComma, boolean canConfirm,
                                    LocalDateTime expiresAt) {

    public record UnknownSpecies(String name, int rows) {
    }

    /** Una fila nueva que podría ser un ejemplar ya registrado: hay que decidir si entra. */
    public record Duplicate(int line, String scientificName, String duplicateOf, double distanceM) {
    }

    public record Issue(int line, String column, String message) {
    }
}
