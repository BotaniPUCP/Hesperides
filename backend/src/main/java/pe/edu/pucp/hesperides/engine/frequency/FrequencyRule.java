package pe.edu.pucp.hesperides.engine.frequency;

import java.time.LocalDate;
import java.util.List;

/**
 * Los parametros de una frecuencia, ya desligados de JPA.
 *
 * <p>El Engine no conoce la entidad ni el repositorio: recibe este record y
 * devuelve un veredicto. Esa frontera es lo que permite probar cada evaluador
 * sin base de datos y lo que impide que una decision de negocio se esconda
 * dentro de una consulta.
 *
 * @param configId       identifica la version que se uso para evaluar; viaja al
 *                       resultado para poder responder "por que este mes salio
 *                       asi" apuntando a la configuracion vigente en esa fecha
 * @param seasons        intervalos por estacion; vacio significa "uniforme todo
 *                       el ano", no una estacion que abarque el ano entero
 * @param validFrom      desde cuando rige esta version
 * @param validTo        hasta cuando rigio; null es la version vigente
 */
public record FrequencyRule(
        Long configId,
        String ruleTypeCode,
        Integer targetDaysInterval,
        Integer minDaysInterval,
        Integer maxDaysInterval,
        Integer annualTargetCount,
        Integer coverageTargetDays,
        Integer seasonStartMonth,
        Integer seasonEndMonth,
        List<SeasonalInterval> seasons,
        LocalDate validFrom,
        LocalDate validTo
) {

    public FrequencyRule {
        seasons = seasons == null ? List.of() : List.copyOf(seasons);
    }

    /** Rige en la fecha dada. valid_to es inclusivo: el ultimo dia todavia cuenta. */
    public boolean rigeEn(LocalDate fecha) {
        if (fecha.isBefore(validFrom)) {
            return false;
        }
        return validTo == null || !fecha.isAfter(validTo);
    }

    /**
     * El intervalo que aplica en una fecha: el de su estacion si hay una
     * configurada, el general si no.
     *
     * <p>Esto es lo que el resumen de texto no podia hacer. Con
     * {@code "Verano: 30-35d · Invierno: 40-45d"} guardado como VARCHAR, saber
     * si un corte de enero cumplio exigia interpretar una cadena; aqui es una
     * busqueda sobre datos.
     */
    public Interval intervaloEn(LocalDate fecha) {
        for (SeasonalInterval s : seasons) {
            if (s.cubre(fecha.getMonthValue())) {
                return new Interval(s.minDaysInterval(), s.maxDaysInterval(), s.season());
            }
        }
        return new Interval(minDaysInterval, maxDaysInterval, null);
    }

    /** Intervalo aplicable y, si vino de una estacion, cual. */
    public record Interval(Integer min, Integer max, String season) {
        public boolean estaDefinido() {
            return min != null && max != null;
        }
    }
}
