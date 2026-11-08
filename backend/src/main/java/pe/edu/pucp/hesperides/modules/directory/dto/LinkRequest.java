package pe.edu.pucp.hesperides.modules.directory.dto;

import jakarta.validation.constraints.NotBlank;

/** Vincula un contacto existente a una organización más. */
public record LinkRequest(@NotBlank(message = "La organización es obligatoria") String organizationCode) {
}
