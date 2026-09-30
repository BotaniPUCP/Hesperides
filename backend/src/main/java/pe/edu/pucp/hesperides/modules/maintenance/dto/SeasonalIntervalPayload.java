package pe.edu.pucp.hesperides.modules.maintenance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

/**
 * Un intervalo estacional, en la forma que viaja por la API.
 *
 * <p>Sustituye al texto "Verano: 30-35d" que antes componia el frontend. La
 * diferencia no es de formato: estos numeros los puede evaluar el Engine, y
 * aquella cadena no.
 */
public record SeasonalIntervalPayload(

        @NotBlank(message = "La estación es obligatoria")
        @Pattern(regexp = "VERANO|OTONO|INVIERNO|PRIMAVERA",
                 message = "La estación debe ser VERANO, OTONO, INVIERNO o PRIMAVERA")
        String season,

        @NotNull(message = "El mes de inicio es obligatorio")
        @Min(value = 1, message = "El mes de inicio debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes de inicio debe estar entre 1 y 12")
        Integer startMonth,

        @NotNull(message = "El mes de fin es obligatorio")
        @Min(value = 1, message = "El mes de fin debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes de fin debe estar entre 1 y 12")
        Integer endMonth,

        @NotNull(message = "El intervalo mínimo de la estación es obligatorio")
        @Positive(message = "El intervalo mínimo debe ser mayor a cero")
        Integer minDaysInterval,

        @NotNull(message = "El intervalo máximo de la estación es obligatorio")
        @Positive(message = "El intervalo máximo debe ser mayor a cero")
        Integer maxDaysInterval,

        @Positive(message = "El intervalo teórico debe ser mayor a cero")
        Integer targetDaysInterval
) {
}
