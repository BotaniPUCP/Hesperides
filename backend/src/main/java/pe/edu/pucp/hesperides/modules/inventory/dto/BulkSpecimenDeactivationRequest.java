package pe.edu.pucp.hesperides.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Solicitud de baja masiva de ejemplares mediante selección múltiple.
 */
public record BulkSpecimenDeactivationRequest(
        @NotEmpty(message = "Debe seleccionar al menos un ejemplar")
        @Size(max = 100, message = "No se pueden dar de baja más de 100 ejemplares a la vez")
        List<@NotBlank String> codes,

        @NotBlank(message = "El motivo de la baja es obligatorio")
        @Size(max = 500, message = "El motivo no puede exceder los 500 caracteres")
        String reason
) {
}
