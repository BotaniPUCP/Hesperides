package pe.edu.pucp.hesperides.modules.maintenance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateMaintenanceFrequencyRequest(
        @NotNull(message = "El tipo de actividad es obligatorio")
        Long activityTypeItemId,

        @NotBlank(message = "El régimen operativo es obligatorio")
        @Pattern(regexp = "IN_HOUSE|OUTSOURCED", message = "El régimen debe ser IN_HOUSE o OUTSOURCED")
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

        @Size(max = 255, message = "El modificador estacional no puede superar los 255 caracteres")
        String seasonModifier,

        @Positive(message = "El ciclo de cobertura debe ser mayor a cero")
        Integer coverageTargetDays,

        @Positive(message = "La duración estimada debe ser mayor a cero")
        Integer estimatedDurationDays,

        String notes
) {
}
