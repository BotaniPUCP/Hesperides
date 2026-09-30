package pe.edu.pucp.hesperides.engine.frequency;

import java.time.LocalDate;

/**
 * El veredicto de un tramo evaluado.
 *
 * @param evaluatedWithConfigId la version de la frecuencia que se uso. Viaja
 *        siempre, incluso cuando el resultado es obvio: es lo que permite
 *        responder "por que este mes salio cumplido" sin reconstruir el estado
 *        de la tabla en esa fecha. Sin el, la vigencia temporal existiria en la
 *        base pero seria inauditable desde la API.
 * @param observedValue lo medido: dias transcurridos para un intervalo,
 *        ejecuciones contadas para una cuota anual
 * @param expectedValue contra que se comparo
 * @param toleranceLimit el techo a partir del cual se incumple
 * @param season la estacion que rigio, si el intervalo vino de una
 * @param prorated si el objetivo se ajusto por evaluar menos de un ano
 * @param outOfSeason ejecuciones que cuentan para la cuota pero cayeron fuera
 *        de la ventana declarada. La poda mayor hecha en julio se hizo, pero no
 *        en el cierre del campus, y el coordinador debe poder verlo.
 */
public record ComplianceResult(
        ComplianceStatus status,
        Long evaluatedWithConfigId,
        Integer observedValue,
        Integer expectedValue,
        Integer toleranceLimit,
        LocalDate lastExecutionDate,
        LocalDate periodStart,
        LocalDate periodEnd,
        String season,
        boolean prorated,
        int outOfSeason,
        String explanation
) {

    public static ComplianceResult notConfigured(LocalDate from, LocalDate to) {
        return new ComplianceResult(
                ComplianceStatus.NOT_CONFIGURED, null, null, null, null, null,
                from, to, null, false, 0,
                "No hay una frecuencia configurada para esta actividad");
    }

    public static ComplianceResult notApplicable(Long configId, LocalDate from, LocalDate to,
                                                 LocalDate lastExecution, String reason) {
        return new ComplianceResult(
                ComplianceStatus.NOT_APPLICABLE, configId, null, null, null, lastExecution,
                from, to, null, false, 0, reason);
    }
}
