package pe.edu.pucp.hesperides.engine.frequency;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Evalua el intervalo entre ejecuciones consecutivas.
 *
 * <p>Sirve a {@code INTERVAL_DAYS} y a {@code COVERAGE_CYCLE}: ambos miden dias
 * transcurridos, solo cambia de donde sale el limite.
 */
final class IntervalEvaluator {

    private IntervalEvaluator() {
    }

    static ComplianceResult evaluate(FrequencyRule rule, List<LocalDate> executions,
                                     LocalDate from, LocalDate to) {
        boolean esCiclo = "COVERAGE_CYCLE".equals(rule.ruleTypeCode());
        int coverage = rule.coverageTargetDays() != null ? rule.coverageTargetDays() : 0;

        if (executions.isEmpty()) {
            return ComplianceResult.notApplicable(rule.configId(), from, to, null,
                    "Nunca se registro una ejecucion de esta actividad");
        }

        List<LocalDate> enPeriodo = executions.stream()
                .filter(d -> !d.isBefore(from) && !d.isAfter(to))
                .toList();
        LocalDate ultima = executions.get(executions.size() - 1);

        if (executions.size() < 2 && enPeriodo.size() < 2) {
            return evaluateSingleExecution(rule, ultima, from, to, esCiclo, coverage);
        }

        List<LocalDate> base = enPeriodo.size() >= 2 ? enPeriodo : executions;
        LocalDate anterior = base.get(base.size() - 2);
        LocalDate reciente = base.get(base.size() - 1);
        long intervalo = ChronoUnit.DAYS.between(anterior, reciente);

        // El tiempo desde la ultima ejecucion tambien cuenta: si supera al
        // intervalo medido, es el que manda, porque dejar de hacer el trabajo es
        // la forma mas comun de incumplir y no produce ningun intervalo nuevo.
        long desdeUltima = ChronoUnit.DAYS.between(reciente, to);
        boolean mandaLaEspera = desdeUltima > intervalo;
        long medido = mandaLaEspera ? desdeUltima : intervalo;
        LocalDate fechaRef = mandaLaEspera ? reciente : anterior;

        Integer limite = limiteDe(rule, fechaRef, esCiclo, coverage);
        if (limite == null) {
            return ComplianceResult.notApplicable(rule.configId(), from, to, reciente,
                    "La regla no define un intervalo maximo contra el cual comparar");
        }
        Integer esperado = esperadoDe(rule, fechaRef, esCiclo, coverage);

        ComplianceStatus status;
        String explicacion;
        if (esperado != null && medido <= esperado) {
            status = ComplianceStatus.ON_TARGET;
            explicacion = "El intervalo de " + medido + " dias esta dentro del objetivo de " + esperado;
        } else if (medido <= limite) {
            status = ComplianceStatus.WITHIN_TOLERANCE;
            explicacion = "El intervalo de " + medido + " dias supera el objetivo pero no el limite de " + limite;
        } else {
            status = ComplianceStatus.OVERDUE;
            explicacion = "El intervalo de " + medido + " dias supera el limite de " + limite;
        }
        if (mandaLaEspera) {
            explicacion += " (medido desde la ultima ejecucion, el " + reciente + ")";
        }

        return new ComplianceResult(status, rule.configId(), (int) medido, esperado, limite,
                reciente, from, to, rule.intervaloEn(fechaRef).season(), false, 0, explicacion);
    }

    /**
     * Una sola ejecucion no produce intervalo. Es una medicion imposible, no un
     * incumplimiento: devolver OVERDUE acusaria al equipo por un dato que el
     * sistema todavia no tiene. Solo si ya paso mas tiempo que el limite hay
     * evidencia suficiente para declarar vencido.
     */
    private static ComplianceResult evaluateSingleExecution(FrequencyRule rule, LocalDate ultima,
                                                            LocalDate from, LocalDate to,
                                                            boolean esCiclo, int coverage) {
        long desde = ChronoUnit.DAYS.between(ultima, to);
        Integer limite = limiteDe(rule, ultima, esCiclo, coverage);

        if (limite != null && desde > limite) {
            return new ComplianceResult(ComplianceStatus.OVERDUE, rule.configId(),
                    (int) desde, esperadoDe(rule, ultima, esCiclo, coverage), limite, ultima,
                    from, to, rule.intervaloEn(ultima).season(), false, 0,
                    "Solo hay una ejecucion registrada y han pasado " + desde
                    + " dias desde entonces, mas del limite de " + limite);
        }
        return ComplianceResult.notApplicable(rule.configId(), from, to, ultima,
                "Se necesitan dos ejecuciones para medir un intervalo; solo hay una");
    }

    private static Integer limiteDe(FrequencyRule rule, LocalDate fecha, boolean esCiclo, int coverage) {
        if (esCiclo) {
            return coverage > 0 ? coverage : null;
        }
        return rule.intervaloEn(fecha).max();
    }

    private static Integer esperadoDe(FrequencyRule rule, LocalDate fecha, boolean esCiclo, int coverage) {
        if (esCiclo) {
            return coverage > 0 ? coverage : null;
        }
        FrequencyRule.Interval iv = rule.intervaloEn(fecha);
        // En una estacion, su propio minimo es el objetivo; fuera de toda
        // estacion manda el teorico general si existe.
        if (iv.season() != null) {
            return iv.min();
        }
        return rule.targetDaysInterval() != null ? rule.targetDaysInterval() : iv.min();
    }
}
