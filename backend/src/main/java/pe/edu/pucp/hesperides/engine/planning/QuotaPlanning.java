package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Cuota anual (SPEC-203 §5.5): cuántas veces va el jardín menos atendido en el año
 * calendario y una fecha estimada para la próxima. La fecha la decide el
 * coordinador, por eso la cuota nunca sale atrasada.
 */
final class QuotaPlanning {

    /** Cuánto antes de la fecha estimada la fila pasa a «toca». */
    static final int NEAR_DUE_DAYS = 7;

    private QuotaPlanning() {
    }

    static PlanningVerdict evaluate(FrequencyRule rule, List<GardenHistory> gardens, LocalDate ref, LocalDate today) {
        Rhythm rhythm = RuleRhythm.of(rule, today);
        int target = rule.annualTargetCount();
        int yearCount = gardens.stream().mapToInt(g -> timesInYear(g, today.getYear())).min().orElse(0);
        int pending = target - yearCount;
        if (pending <= 0) {
            return PlanningVerdict.of(PlanningState.DONE_FOR_PERIOD, null, null, rhythm).withQuota(null, yearCount);
        }
        long spacing = Math.round(365.0 / target);
        LocalDate byRhythm = ref.plusDays(spacing);
        LocalDate toFitTheYear = LocalDate.of(today.getYear(), 12, 31).minusDays((pending - 1) * spacing);
        LocalDate estimated = max(today, min(byRhythm, toFitTheYear));
        int days = (int) ChronoUnit.DAYS.between(today, estimated);
        PlanningState state = days > NEAR_DUE_DAYS ? PlanningState.NOT_DUE : PlanningState.DUE;
        return PlanningVerdict.of(state, days, estimated, rhythm).withQuota(estimated, yearCount);
    }

    private static int timesInYear(GardenHistory garden, int year) {
        return (int) garden.dates().stream().filter(d -> d.date().getYear() == year)
                .map(GardenHistory.GardenDate::interventionId).distinct().count();
    }

    private static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }

    private static LocalDate max(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }
}
