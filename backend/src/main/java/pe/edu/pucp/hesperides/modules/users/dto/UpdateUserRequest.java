package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Edición de una cuenta (SPEC-100 PUT /users/{id}). No toca contraseña ni
 * is_active a propósito (§2.7): para eso existen los endpoints dedicados.
 * Un campo extra "password" desconocido en el DTO es ignorado por Jackson
 * (CA-09), de modo que un cliente curioso no puede fijar claves ajenas.
 */
public record UpdateUserRequest(
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
        String roleCode) {
}