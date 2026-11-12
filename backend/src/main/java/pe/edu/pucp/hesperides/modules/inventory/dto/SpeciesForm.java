package pe.edu.pucp.hesperides.modules.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Formulario para registrar o editar una especie del catálogo botánico. Sin
 * {@code critical}, al registrar decide el tipo y al editar se conserva (SPEC-105 §5.1).
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
        String careNotes,

        Boolean critical,

        @DecimalMin(value = "0.01", message = "La altura promedio debe ser mayor que 0")
        @DecimalMax(value = "999.99", message = "La altura promedio no puede superar 999.99 m")
        BigDecimal referenceHeightM,

        @Size(max = 50, message = "La fuente no puede exceder 50 caracteres")
        String referenceHeightSourceCode,

        @DecimalMin(value = "0.01", message = "El radio de copa promedio debe ser mayor que 0")
        @DecimalMax(value = "999.99", message = "El radio de copa promedio no puede superar 999.99 m")
        BigDecimal referenceCrownRadiusM,

        @Size(max = 50, message = "La fuente no puede exceder 50 caracteres")
        String referenceCrownRadiusSourceCode,

        Boolean usesTrunkHeight,

        Boolean usesDbh,

        /** Sin lista, se conservan las medidas adicionales de la especie. */
        List<@NotNull @Valid ExtraMeasure> extraMeasures
) {
    public record ExtraMeasure(
            @NotBlank(message = "La medida adicional necesita un código")
            String code,

            @Size(max = 200, message = "La referencia no puede exceder 200 caracteres")
            String referenceNote) {
    }

}
