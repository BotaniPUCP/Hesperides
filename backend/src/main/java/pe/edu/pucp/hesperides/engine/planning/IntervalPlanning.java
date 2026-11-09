package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Intervalo de días y ciclo de cobertura (SPEC-203 D-05): antes del mínimo aún
 * no toca, entre el mínimo y el máximo toca, después del máximo está atrasada. La
 * estación es la de la última vez, porque el jardín creció en esas condiciones.
 */
final class IntervalPlanning {

    private IntervalPlanning() {
    }

    static PlanningVerdict evaluate(FrequencyRule rule, LocalDate ref, LocalDate today) {
        Rhythm rhythm = RuleRhythm.of(rule, ref);
        if (rhythm.minDays() == null || rhythm.maxDays() == null) {
            return PlanningVerdict.of(PlanningState.NOT_CONFIGURED, null, null, rhythm);
        }
        LocalDate opens = ref.plusDays(rhythm.minDays());
        LocalDate closes = ref.plusDays(rhythm.maxDays());
        if (today.isBefore(opens)) {
            return PlanningVerdict.of(PlanningState.NOT_DUE, days(today, opens), opens, rhythm);
        }
        if (!today.isAfter(closes)) {
            return PlanningVerdict.of(PlanningState.DUE, days(today, closes), today, rhythm);
        }
        return PlanningVerdict.of(PlanningState.OVERDUE, days(closes, today), today, rhythm);
    }

    private static int days(LocalDate from, LocalDate to) {
        return (int) ChronoUnit.DAYS.between(from, to);
    }
}
