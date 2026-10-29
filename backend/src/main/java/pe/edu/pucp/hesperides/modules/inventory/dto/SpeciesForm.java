package pe.edu.pucp.hesperides.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Formulario para dar de alta una nueva especie en el catálogo botánico.
 */
public record SpeciesForm(
        @NotBlank(message = "El nombre científico es obligatorio")
        @Size(max = 150, message = "El nombre científico no puede exceder 150 caracteres")
        String scientificName,

        @Size(max = 150, message = "El nombre común no puede exceder 150 caracteres")
        String commonName,

        @Size(max = 100, message = "La familia no puede exceder 100 caracteres")
        String family,

        @NotBlank(message = "El tipo de vegetación es obligatorio")
        @Size(max = 50, message = "El tipo de vegetación no puede exceder 50 caracteres")
        String vegetationTypeCode,

        @Size(max = 50, message = "El origen no puede exceder 50 caracteres")
        String originCode,

        List<String> otherNames,

        @Size(max = 2000, message = "La descripción no puede exceder 2000 caracteres")
        String description,

        @Size(max = 2000, message = "Las notas de cuidado no pueden exceder 2000 caracteres")
        String careNotes
) {
}
