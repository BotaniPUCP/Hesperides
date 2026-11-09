package pe.edu.pucp.hesperides.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Una medida nueva para el catálogo (SPEC-105 D-08). */
public record ExtraMeasureForm(
        @NotBlank(message = "El nombre de la medida es obligatorio")
        @Size(max = 100, message = "El nombre no puede exceder 100 caracteres")
        String label,

        @NotBlank(message = "La unidad es obligatoria")
        @Size(max = 50, message = "La unidad no puede exceder 50 caracteres")
        String unitCode) {
}
