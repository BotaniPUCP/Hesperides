package pe.edu.pucp.hesperides.engine.planning;

import java.time.LocalDate;

/**
 * El veredicto de una fila (SPEC-203 §3.2). {@code days} cambia de sentido según
 * el estado: faltan (NOT_DUE), quedan (DUE), días tarde (OVERDUE) o jardines que
 * faltan (IN_PROGRESS).
 */
public record PlanningVerdict(PlanningState state, Integer days, LocalDate lastDate, Integer daysSinceLast,
                              Progress progress, int neverAttendedCount, OpenRound openRound,
                              LocalDate estimatedDate, Integer yearCount, LocalDate suggestedDate, Rhythm rhythm) {

    static PlanningVerdict of(PlanningState state, Integer days, LocalDate suggested, Rhythm rhythm) {
        return new PlanningVerdict(state, days, null, null, null, 0, null, null, null, suggested, rhythm);
    }

    PlanningVerdict withHistory(LocalDate last, Integer sinceLast, int neverAttended) {
        return new PlanningVerdict(state, days, last, sinceLast, progress, neverAttended, openRound,
                estimatedDate, yearCount, suggestedDate, rhythm);
    }

    PlanningVerdict withQuota(LocalDate estimated, int count) {
        return new PlanningVerdict(state, days, lastDate, daysSinceLast, progress, neverAttendedCount, openRound,
                estimated, count, suggestedDate, rhythm);
    }
}
