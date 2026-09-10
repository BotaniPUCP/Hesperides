package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank(message = "La contraseña actual es obligatoria")
        String currentPassword,

        @NotBlank(message = "La contraseña nueva es obligatoria")
        String newPassword) {
}
