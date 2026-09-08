package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Alta de una cuenta (SPEC-100 POST /users). La contraseña inicial la escribe
 * el ADMIN; la validación de fondo de la política de §9.1 ocurre en el
 * servicio porque no es expresable con Bean Validation.
 */
public record CreateUserRequest(
        @NotBlank(message = "El correo es requerido")
        @Email(message = "Debe ser un correo electrónico válido")
        @Size(max = 255, message = "El correo no debe exceder 255 caracteres")
        String email,

        @NotBlank(message = "El nombre es requerido")
        @Size(max = 100, message = "El nombre no debe exceder 100 caracteres")
        String firstName,

        @NotBlank(message = "El apellido es requerido")
        @Size(max = 100, message = "El apellido no debe exceder 100 caracteres")
        String lastName,

        @NotBlank(message = "El rol es requerido")
        @Size(max = 50, message = "El rol no debe exceder 50 caracteres")
        String roleCode,

        @NotBlank(message = "La contraseña inicial es requerida")
        @Size(max = 72, message = "La contraseña no debe exceder 72 caracteres")
        String initialPassword) {
}