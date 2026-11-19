package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

/**
 * Ventana anual, como la poda mayor de diciembre a enero (SPEC-203 §5.5). Una
 * ventana puede cruzar el año: la de diciembre de 2026 termina en enero de 2027.
 */
final class WindowPlanning {

    private record Window(LocalDate start, LocalDate end) {
        boolean contains(LocalDate d) {
            return !d.isBefore(start) && !d.isAfter(end);
        }
    }

    private WindowPlanning() {
    }

    static PlanningVerdict evaluate(FrequencyRule rule, List<GardenHistory> gardens, LocalDate today) {
        Rhythm rhythm = RuleRhythm.of(rule, today);
        int from = rule.seasonStartMonth();
        int to = rule.seasonEndMonth();
        Optional<Window> current = windows(from, to, today).filter(w -> w.contains(today)).findFirst();
        if (current.isPresent()) {
            Window w = current.get();
            return allAttendedIn(gardens, w)
                    ? PlanningVerdict.of(PlanningState.DONE_FOR_PERIOD, null, null, rhythm)
                    : PlanningVerdict.of(PlanningState.DUE, days(today, w.end()), today, rhythm);
        }
        // Una ventana que cerró antes de que existiera la regla no se le puede reclamar a nadie.
        Optional<Window> last = windows(from, to, today)
                .filter(w -> w.end().isBefore(today) && !w.end().isBefore(rule.validFrom()))
                .reduce((a, b) -> b.end().isAfter(a.end()) ? b : a);
        if (last.isPresent() && !allAttendedIn(gardens, last.get())) {
            return PlanningVerdict.of(PlanningState.OVERDUE, days(last.get().end(), today), today, rhythm);
        }
        LocalDate next = windows(from, to, today).map(Window::start).filter(s -> s.isAfter(today))
                .min(LocalDate::compareTo).orElseThrow();
        return PlanningVerdict.of(PlanningState.NOT_DUE, days(today, next), next, rhythm);
    }

    /** Las ventanas que empiezan desde dos años antes hasta un año después de hoy. */
    private static java.util.stream.Stream<Window> windows(int from, int to, LocalDate today) {
        return IntStream.rangeClosed(today.getYear() - 2, today.getYear() + 1).mapToObj(year -> {
            int endYear = from <= to ? year : year + 1;
            return new Window(LocalDate.of(year, from, 1), YearMonth.of(endYear, to).atEndOfMonth());
        });
    }

    private static boolean allAttendedIn(List<GardenHistory> gardens, Window w) {
        return gardens.stream().allMatch(g -> g.dates().stream().anyMatch(d -> w.contains(d.date())));
    }

    private static int days(LocalDate from, LocalDate to) {
        return (int) ChronoUnit.DAYS.between(from, to);
    }
}
