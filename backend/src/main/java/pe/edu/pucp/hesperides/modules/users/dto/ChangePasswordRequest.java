package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cambio de la propia contraseña (SPEC-100 POST /users/me/password). Es el
 * único endpoint que acepta una contraseña escrita a mano después del alta,
 * y solo sobre la cuenta del propio token.
 */
public record ChangePasswordRequest(
        @NotBlank(message = "La contraseña actual es requerida")
        String currentPassword,

        @NotBlank(message = "La nueva contraseña es requerida")
        @Size(max = 72, message = "La contraseña no debe exceder 72 caracteres")
        String newPassword) {
}