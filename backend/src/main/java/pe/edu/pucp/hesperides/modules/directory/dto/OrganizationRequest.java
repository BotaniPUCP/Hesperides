package pe.edu.pucp.hesperides.modules.directory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Alta o edición de una organización. RUC y unicidad los valida el servicio. */
public record OrganizationRequest(
        @NotBlank(message = "The name is required")
        @Size(max = 200, message = "The name cannot exceed 200 characters")
        String name,

        @NotBlank(message = "The type is required")
        String typeCode,

        String ruc,

        @Size(max = 30, message = "The phone cannot exceed 30 characters")
        String phone,

        List<@NotBlank @Size(max = 200, message = "An alias cannot exceed 200 characters") String> aliases) {

    public List<String> aliasesOrEmpty() {
        return aliases == null ? List.of() : aliases;
    }
}
