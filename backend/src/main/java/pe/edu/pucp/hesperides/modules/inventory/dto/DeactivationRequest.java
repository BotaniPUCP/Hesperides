package pe.edu.pucp.hesperides.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Motivo obligatorio para dejar una especie o ejemplar fuera del inventario operativo. */
public record DeactivationRequest(@NotBlank @Size(max = 500) String reason) {
}
