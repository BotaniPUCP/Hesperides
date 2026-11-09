package pe.edu.pucp.hesperides.modules.planning.sets.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

/** {@code version} solo al editar: el conjunto que el usuario vio al abrir el formulario. */
public record GreenAreaSetRequest(
        @Size(max = 120, message = "El nombre no puede pasar de 120 caracteres") String name,
        @Size(max = 2000, message = "La descripción no puede pasar de 2000 caracteres") String description,
        List<Long> zoneIds,
        List<Long> activityTypeItemIds,
        @PositiveOrZero Long version) {
}
