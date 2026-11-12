package pe.edu.pucp.hesperides.modules.imports.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static pe.edu.pucp.hesperides.modules.imports.dto.AssessmentForm.blankToNull;

/**
 * Un ejemplar del formulario de registro (SPEC-103 §5.1). Son los mismos datos
 * que una fila del estándar CSV, así que se resuelve y escribe por el mismo
 * camino que la carga.
 */
public record SpecimenForm(@NotBlank @Size(max = 150) String scientificName,
                           @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                           @NotNull @DecimalMin("-180") @DecimalMax("180") Double lon,
                           @Positive Integer quantity,
                           @Size(max = 40) String sourceReference, @Size(max = 40) String legacyCode,
                           @Size(max = 150) String sourceLocation,
                           @Valid MeasurementForm measurement, @Valid AssessmentForm assessment,
                           @Size(max = 2000) String notes) {

    public record MeasurementForm(@NotNull @PastOrPresent LocalDate date, @Positive Double heightM,
                                  @PositiveOrZero Double trunkHeightM, @PositiveOrZero Double dbhCm,
                                  @Positive Double crownRadiusM, Boolean banded,
                                  List<@NotNull @Valid ExtraValueForm> extraValues) {

        /** Las medidas adicionales, listas para escribir. Sin lista, ninguna. */
        public List<SpecimenDraft.ExtraValue> toExtraValues() {
            return extraValues == null ? List.of()
                    : extraValues.stream().map(v -> new SpecimenDraft.ExtraValue(v.code(), v.value())).toList();
        }
    }

    public record ExtraValueForm(@NotBlank @Size(max = 50) String code,
                                 @NotNull @PositiveOrZero @DecimalMax("99999999.99") BigDecimal value) {
    }

    public SpecimenDraft toDraft(String code) {
        SpecimenDraft.Measurement m = measurement == null ? null : new SpecimenDraft.Measurement(measurement.date(),
                measurement.heightM(), measurement.trunkHeightM(), measurement.dbhCm(), measurement.crownRadiusM(),
                measurement.banded(), measurement.toExtraValues());
        return new SpecimenDraft(0, code, scientificName.trim(), lat, lon, quantity == null ? 1 : quantity,
                blankToNull(sourceReference), blankToNull(legacyCode), blankToNull(sourceLocation), m,
                assessment == null ? null : assessment.toDraft(), null, blankToNull(notes));
    }
}
