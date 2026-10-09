package pe.edu.pucp.hesperides.modules.places.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Alta o edición de un lugar. El contorno y la jerarquía los valida el servicio. */
public record PlaceRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 200, message = "El nombre no puede superar los 200 caracteres")
        String name,

        @NotBlank(message = "El tipo es obligatorio")
        String kindCode,

        @NotBlank(message = "La categoría es obligatoria")
        String categoryCode,

        String parentCode,

        @NotNull(message = "El contorno es obligatorio (vacío para un interior)")
        @Valid
        OutlineRequest outline,

        List<@NotBlank @Size(max = 200, message = "Un alias no puede superar los 200 caracteres") String> aliases) {

    public List<String> aliasesOrEmpty() {
        return aliases == null ? List.of() : aliases;
    }
}
