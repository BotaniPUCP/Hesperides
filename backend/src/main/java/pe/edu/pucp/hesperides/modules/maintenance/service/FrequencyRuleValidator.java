package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.maintenance.dto.SeasonalIntervalPayload;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Coherencia entre el tipo de regla y sus parametros.
 *
 * <p>Vive fuera del servicio porque es una regla de negocio completa y no un
 * detalle de la orquestacion. Tampoco puede vivir en la base: la coherencia
 * depende del {@code code} del item de catalogo referenciado, que esta en otra
 * tabla, y un CHECK no puede consultarla.
 *
 * <p>Se rechaza en vez de ignorar en silencio: un dato contradictorio guardado
 * "a medias" produce evaluaciones que nadie sabe explicar.
 */
final class FrequencyRuleValidator {

    private FrequencyRuleValidator() {
    }

    static void validate(String ruleTypeCode, Integer minDays, Integer maxDays,
                         Integer annualCount, Integer coverageDays,
                         Integer windowStart, Integer windowEnd,
                         List<SeasonalIntervalPayload> seasons) {

        switch (ruleTypeCode) {
            case "INTERVAL_DAYS" -> validateInterval(minDays, maxDays, seasons);
            case "SEASONAL_PERIOD" -> requireAnnualCount(annualCount);
            case "ANNUAL_WINDOW" -> {
                requireAnnualCount(annualCount);
                requireWindow(windowStart, windowEnd);
            }
            case "COVERAGE_CYCLE" -> {
                if (coverageDays == null || coverageDays <= 0) {
                    throw new BusinessRuleException(
                            "Las reglas por ciclo de cobertura requieren especificar los días objetivo de cobertura");
                }
            }
            case "ON_DEMAND" -> rejectParameters(minDays, maxDays, annualCount, coverageDays, seasons);
            default -> throw new BusinessRuleException(
                    "Tipo de regla de frecuencia no soportado: " + ruleTypeCode);
        }

        validateSeasons(seasons);
    }

    private static void validateInterval(Integer minDays, Integer maxDays,
                                         List<SeasonalIntervalPayload> seasons) {
        boolean tieneEstaciones = seasons != null && !seasons.isEmpty();

        // El intervalo general puede faltar SI hay estaciones que lo cubran: una
        // frecuencia estacional define su periodicidad ahi.
        if (!tieneEstaciones && (minDays == null || maxDays == null)) {
            throw new BusinessRuleException(
                    "Las reglas de intervalo por días requieren definir intervalo mínimo y máximo, "
                    + "o al menos una estación con los suyos");
        }
        if (minDays != null && maxDays != null && minDays > maxDays) {
            throw new BusinessRuleException("El intervalo mínimo no puede superar al intervalo máximo");
        }
    }

    private static void requireAnnualCount(Integer annualCount) {
        if (annualCount == null || annualCount <= 0) {
            throw new BusinessRuleException(
                    "Las reglas estacionales o anuales requieren una cuota anual mínima mayor a cero");
        }
    }

    private static void requireWindow(Integer start, Integer end) {
        if (start == null || end == null) {
            throw new BusinessRuleException(
                    "Las reglas de ventana anual requieren el mes de inicio y el de fin");
        }
    }

    /**
     * ON_DEMAND con parametros es contradictorio: declara no tener periodicidad y
     * a la vez la describe. Guardarlo dejaria un dato que el evaluador ignora sin
     * que nadie sepa por que.
     */
    private static void rejectParameters(Integer minDays, Integer maxDays, Integer annualCount,
                                         Integer coverageDays, List<SeasonalIntervalPayload> seasons) {
        boolean algunParametro = minDays != null || maxDays != null || annualCount != null
                || coverageDays != null || (seasons != null && !seasons.isEmpty());
        if (algunParametro) {
            throw new BusinessRuleException(
                    "Una actividad a demanda no lleva parámetros de periodicidad: "
                    + "si tiene una frecuencia, elija otro tipo de regla");
        }
    }

    private static void validateSeasons(List<SeasonalIntervalPayload> seasons) {
        if (seasons == null || seasons.isEmpty()) {
            return;
        }
        Set<String> vistas = new HashSet<>();
        for (SeasonalIntervalPayload s : seasons) {
            if (!vistas.add(s.season())) {
                throw new BusinessRuleException(
                        "La estación " + s.season() + " está configurada más de una vez");
            }
            if (s.minDaysInterval() > s.maxDaysInterval()) {
                throw new BusinessRuleException(
                        "En la estación " + s.season()
                        + ", el intervalo mínimo no puede superar al máximo");
            }
        }
    }
}
