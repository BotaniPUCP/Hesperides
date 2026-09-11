package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Nótese que no hay campo de contraseña: un administrador no fija la clave de
 * otra persona, la regenera (SPEC-100 §2.7). Si el cliente envía un campo
 * "password" extra, Jackson lo ignora y la contraseña no cambia.
 */
public record UpdateUserRequest(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Debe ser un correo electrónico válido")
        @Size(max = 255, message = "El correo no puede superar los 255 caracteres")
        String email,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        String lastName,

        @NotBlank(message = "El rol es obligatorio")
        String roleCode) {
}
