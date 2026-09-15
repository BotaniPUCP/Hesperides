package pe.edu.pucp.hesperides.modules.catalogs.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * Sin campo code: renombrarlo rompería toda fila que lo referencia y toda
 * decisión que el backend toma comparando ese valor (SPEC-003 §4).
 */
public record UpdateCatalogItemRequest(
        @NotBlank
        @Size(max = 100)
        String label,

        @PositiveOrZero
        Integer sortOrder,

        Map<String, Object> metadata) {
}
