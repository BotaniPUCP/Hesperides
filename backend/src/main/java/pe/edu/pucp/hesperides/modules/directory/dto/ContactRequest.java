package pe.edu.pucp.hesperides.modules.directory.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Alta o edición de un contacto. Los teléfonos llegan como se escribieron: el servicio los normaliza. */
public record ContactRequest(
        @NotBlank(message = "El nombre completo es obligatorio")
        @Size(max = 200, message = "El nombre completo no puede superar los 200 caracteres")
        String fullName,

        List<@NotBlank String> organizationCodes,

        String extension,

        String mobile,

        @Email(message = "El correo no es válido")
        @Size(max = 254, message = "El correo no puede superar los 254 caracteres")
        String email) {

    public List<String> organizationCodesOrEmpty() {
        return organizationCodes == null ? List.of() : organizationCodes.stream().distinct().toList();
    }
}
