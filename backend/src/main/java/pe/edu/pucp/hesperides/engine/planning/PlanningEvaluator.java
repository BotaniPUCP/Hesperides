package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * El estado de un conjunto de jardines para una actividad (SPEC-203 §5.5).
 *
 * <p>Primero mira lo abierto: si ya hay una intervención para esos jardines, la
 * fila dice eso y no vuelve a pedir que se planifique. Si no, la referencia es la
 * última vez del jardín atendido hace más tiempo (D-03) y el tipo de regla decide.
 */
public final class PlanningEvaluator {

    private PlanningEvaluator() {
    }

    public static PlanningVerdict evaluate(FrequencyRule rule, List<GardenHistory> gardens,
                                           List<OpenRound> open, LocalDate today) {
        if (rule == null) {
            return PlanningVerdict.of(PlanningState.NOT_CONFIGURED, null, null, null);
        }
        Set<Long> setZones = gardens.stream().map(GardenHistory::zoneId).collect(Collectors.toSet());
        LocalDate ref = gardens.stream().map(GardenHistory::last).filter(Objects::nonNull)
                .min(LocalDate::compareTo).orElse(null);
        int neverAttended = (int) gardens.stream().filter(g -> g.last() == null).count();
        Integer sinceLast = ref == null ? null : (int) ChronoUnit.DAYS.between(ref, today);

        PlanningVerdict verdict = openVerdict(rule, gardens, setZones, open, today);
        if (verdict == null) {
            verdict = neverAttended > 0
                    ? PlanningVerdict.of(PlanningState.DUE, null, today, RuleRhythm.of(rule, today))
                    : byRuleType(rule, gardens, ref, today);
        }
        return verdict.withHistory(ref, sinceLast, neverAttended);
    }

    private static PlanningVerdict byRuleType(FrequencyRule rule, List<GardenHistory> gardens,
                                              LocalDate ref, LocalDate today) {
        return switch (rule.ruleTypeCode()) {
            case "INTERVAL_DAYS", "COVERAGE_CYCLE" -> IntervalPlanning.evaluate(rule, ref, today);
            case "SEASONAL_PERIOD" -> QuotaPlanning.evaluate(rule, gardens, ref, today);
            case "ANNUAL_WINDOW" -> WindowPlanning.evaluate(rule, gardens, today);
            default -> throw new IllegalArgumentException(
                    "La regla '" + rule.ruleTypeCode() + "' no se planifica: el servicio no debió enviarla");
        };
    }

    /** La intervención abierta con la fecha programada más temprana que toque jardines del conjunto. */
    private static PlanningVerdict openVerdict(FrequencyRule rule, List<GardenHistory> gardens, Set<Long> setZones,
                                               List<OpenRound> open, LocalDate today) {
        OpenRound round = open.stream()
                .filter(o -> o.pendingZoneIds().stream().anyMatch(setZones::contains))
                .min(Comparator.comparing(OpenRound::scheduledDate)).orElse(null);
        if (round == null) {
            return null;
        }
        Rhythm rhythm = RuleRhythm.of(rule, today);
        if (round.firstStartedDate() == null) {
            return withOpen(PlanningVerdict.of(PlanningState.SCHEDULED, null, round.scheduledDate(), rhythm), round, null);
        }
        int done = (int) gardens.stream().filter(g -> g.last() != null && !g.last().isBefore(round.firstStartedDate()))
                .count();
        var progress = new Progress(done, gardens.size());
        return withOpen(PlanningVerdict.of(PlanningState.IN_PROGRESS, gardens.size() - done, today, rhythm), round, progress);
    }

    private static PlanningVerdict withOpen(PlanningVerdict v, OpenRound round, Progress progress) {
        return new PlanningVerdict(v.state(), v.days(), null, null, progress, 0, round, null, null,
                v.suggestedDate(), v.rhythm());
    }
}
