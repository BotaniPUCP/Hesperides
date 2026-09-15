package pe.edu.pucp.hesperides.modules.catalogs.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * El code lo fija quien crea el ítem y después es inmutable: otras tablas lo
 * referencian y el backend decide por él.
 */
public record CreateCatalogItemRequest(
        @NotBlank
        @Size(max = 50)
        @Pattern(regexp = "^[A-Z][A-Z0-9_]*$",
                message = "El código usa mayúsculas, dígitos y guion bajo, y empieza por letra")
        String code,

        @NotBlank
        @Size(max = 100)
        String label,

        @PositiveOrZero
        Integer sortOrder,

        /** Code del ítem padre, solo en catálogos de dos niveles. */
        String parentCode,

        Map<String, Object> metadata) {
}
