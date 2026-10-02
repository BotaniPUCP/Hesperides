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

    /**
     * Una fila nueva que podría ser algo ya registrado: hay que decidir si entra.
     * {@code label} es la especie o el lugar; {@code speciesSlug}, solo para ejemplares.
     */
    public record Duplicate(int line, String label, String speciesSlug, String duplicateOf, double distanceM) {
    }

    public record Issue(int line, String column, String message) {
    }
}
