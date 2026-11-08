package pe.edu.pucp.hesperides.modules.directory.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Alta o edición de un contacto. Los teléfonos llegan como se escribieron: el servicio los normaliza. */
public record ContactRequest(
        @NotBlank(message = "The full name is required")
        @Size(max = 200, message = "The full name cannot exceed 200 characters")
        String fullName,

        List<@NotBlank String> organizationCodes,

        String extension,

        String mobile,

        @Email(message = "The email is not valid")
        @Size(max = 254, message = "The email cannot exceed 254 characters")
        String email) {

    public List<String> organizationCodesOrEmpty() {
        return organizationCodes == null ? List.of() : organizationCodes.stream().distinct().toList();
    }
}
