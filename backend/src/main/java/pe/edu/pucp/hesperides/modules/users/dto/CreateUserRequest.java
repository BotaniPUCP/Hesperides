package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
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
        String roleCode,

        // La politica completa la valida PasswordPolicy en el servicio: Bean
        // Validation no puede comprobar que la clave no contenga el nombre.
        @NotBlank(message = "La contraseña es obligatoria")
        String initialPassword) {
}
