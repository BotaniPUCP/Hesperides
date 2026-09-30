package pe.edu.pucp.hesperides.engine.frequency;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Cuenta ejecuciones dentro del periodo y las compara con una cuota anual.
 *
 * <p>Sirve a {@code SEASONAL_PERIOD} y a {@code ANNUAL_WINDOW}; el segundo ademas
 * mira si cada ejecucion cayo dentro de la ventana declarada.
 */
final class AnnualCountEvaluator {

    private static final int DIAS_DEL_ANO = 365;

    private AnnualCountEvaluator() {
    }

    static ComplianceResult evaluate(FrequencyRule rule, List<LocalDate> executions,
                                     LocalDate from, LocalDate to, boolean conVentana) {
        Integer cuota = rule.annualTargetCount();
        if (cuota == null || cuota <= 0) {
            LocalDate ultima = executions.isEmpty() ? null : executions.get(executions.size() - 1);
            return ComplianceResult.notApplicable(rule.configId(), from, to, ultima,
                    "La regla no define una cuota anual contra la cual comparar");
        }

        List<LocalDate> enPeriodo = executions.stream()
                .filter(d -> !d.isBefore(from) && !d.isAfter(to))
                .toList();

        long dias = ChronoUnit.DAYS.between(from, to) + 1;
        boolean prorrateado = dias < DIAS_DEL_ANO;
        // Sin prorrateo, todo trimestre saldria incumplido contra una cuota anual
        // de 4. Se redondea hacia arriba con piso de 1: un objetivo de 0,99
        // siempre se cumpliria solo.
        int objetivo = prorrateado
                ? Math.max(1, (int) Math.ceil(cuota * dias / (double) DIAS_DEL_ANO))
                : cuota;

        int fueraDeVentana = conVentana ? contarFueraDeVentana(rule, enPeriodo) : 0;
        int observado = enPeriodo.size();

        ComplianceStatus status = observado >= objetivo
                ? ComplianceStatus.ON_TARGET
                : ComplianceStatus.OVERDUE;

        return new ComplianceResult(status, rule.configId(), observado, objetivo, objetivo,
                executions.isEmpty() ? null : executions.get(executions.size() - 1),
                from, to, null, prorrateado, fueraDeVentana,
                explicar(observado, objetivo, cuota, prorrateado, fueraDeVentana));
    }

    /**
     * Ejecuciones que cuentan para la cuota pero cayeron fuera de su ventana.
     * La poda mayor hecha en julio se hizo, pero no en el cierre del campus, y el
     * coordinador debe poder verlo.
     */
    private static int contarFueraDeVentana(FrequencyRule rule, List<LocalDate> enPeriodo) {
        if (rule.seasonStartMonth() == null || rule.seasonEndMonth() == null) {
            return 0;
        }
        SeasonalInterval ventana = new SeasonalInterval(
                null, rule.seasonStartMonth(), rule.seasonEndMonth(), null, null, null);
        return (int) enPeriodo.stream()
                .filter(d -> !ventana.cubre(d.getMonthValue()))
                .count();
    }

    private static String explicar(int observado, int objetivo, int cuota,
                                   boolean prorrateado, int fueraDeVentana) {
        StringBuilder msg = new StringBuilder()
                .append(observado).append(" ejecucion").append(observado == 1 ? "" : "es")
                .append(" frente a un objetivo de ").append(objetivo);
        if (prorrateado) {
            msg.append(" (prorrateado desde una cuota anual de ").append(cuota).append(")");
        }
        if (fueraDeVentana > 0) {
            msg.append(". ").append(fueraDeVentana)
               .append(fueraDeVentana == 1 ? " cayo" : " cayeron")
               .append(" fuera de la ventana declarada");
        }
        return msg.toString();
    }
}
