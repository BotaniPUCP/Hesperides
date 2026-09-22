package pe.edu.pucp.hesperides.modules.maintenance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.util.List;

/**
 * Los cambios que se piden sobre una frecuencia.
 *
 * <p>Ojo con el verbo: este PUT no actualiza en sitio, VERSIONA. Cierra la
 * vigente y crea una nueva con estos valores (salvo que la vigente se haya
 * creado hoy, porque entonces no hay ningun periodo evaluado que proteger).
 * Se eligio PUT y no POST /versions porque desde la UI el usuario esta
 * editando una frecuencia, no creando un objeto nuevo: el versionado es un
 * detalle de implementacion que no debe filtrarse al verbo.
 *
 * <p>El tipo de actividad no se puede cambiar: es la identidad de la regla.
 * Para cambiarla se desactiva esta y se crea otra.
 */
public record UpdateMaintenanceFrequencyRequest(
        @Pattern(regexp = "IN_HOUSE|OUTSOURCED", message = "La modalidad debe ser IN_HOUSE o OUTSOURCED")
        String regime,

        String frequencyRuleTypeCode,

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

        /**
         * Null deja las estaciones como estan; una lista vacia las elimina y
         * vuelve la frecuencia uniforme. Son intenciones distintas y por eso se
         * distinguen en vez de tratar ambas como "sin cambios".
         */
        @Valid
        List<SeasonalIntervalPayload> seasons,

        String notes,

        Boolean active
) {
}
