package pe.edu.pucp.hesperides.modules.maintenance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record CreateMaintenanceFrequencyRequest(
        @NotNull(message = "El tipo de actividad es obligatorio")
        Long activityTypeItemId,

        @NotBlank(message = "La modalidad de ejecución es obligatoria")
        @Pattern(regexp = "IN_HOUSE|OUTSOURCED", message = "La modalidad debe ser IN_HOUSE o OUTSOURCED")
        String regime,

        @NotBlank(message = "El tipo de regla de frecuencia es obligatorio")
        String frequencyRuleTypeCode,

        @NotBlank(message = "El ámbito de aplicación es obligatorio")
        @Pattern(regexp = "CAMPUS_WIDE|BY_SECTOR|BY_ZONE", message = "El ámbito debe ser CAMPUS_WIDE, BY_SECTOR o BY_ZONE")
        String scope,

        Long zoneId,

        @Positive(message = "El intervalo objetivo debe ser mayor a cero")
        Integer targetDaysInterval,

        @Positive(message = "El intervalo mínimo debe ser mayor a cero")
        Integer minDaysInterval,

        @Positive(message = "El intervalo máximo debe ser mayor a cero")
        Integer maxDaysInterval,

        @Positive(message = "La cuota anual debe ser mayor a cero")
        Integer annualTargetCount,

        @Positive(message = "El ciclo de cobertura debe ser mayor a cero")
        Integer coverageTargetDays,

        @Positive(message = "La duración estimada debe ser mayor a cero")
        Integer estimatedDurationDays,

        @Min(value = 1, message = "El mes de inicio de la ventana debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes de inicio de la ventana debe estar entre 1 y 12")
        Integer seasonStartMonth,

        @Min(value = 1, message = "El mes de fin de la ventana debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes de fin de la ventana debe estar entre 1 y 12")
        Integer seasonEndMonth,

        /** Vacio o ausente significa "uniforme todo el ano". */
        @Valid
        List<SeasonalIntervalPayload> seasons,

        String notes
) {
}
