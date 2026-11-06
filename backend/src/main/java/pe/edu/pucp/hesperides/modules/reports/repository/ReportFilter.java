package pe.edu.pucp.hesperides.modules.reports.repository;

import pe.edu.pucp.hesperides.engine.reporting.DateRange;

import java.time.ZoneId;
import java.util.List;
import java.util.Set;

/**
 * A validated report query: the period, the optional filters and the reader's
 * scope. Every id has already been checked against the scope, so the queries
 * only translate it into parameters.
 *
 * @param campus         ADMIN and COORDINADOR; otherwise a SUPERVISOR restricted to
 *                       {@code scopeTeamIds} (work and incidents) and
 *                       {@code scopeSectorIds} (denominator).
 */
public record ReportFilter(
        DateRange period,
        ZoneId zone,
        Long sectorId,
        Long sectionId,
        Long teamId,
        Long classItemId,
        Long typeItemId,
        boolean campus,
        Long userId,
        List<Long> scopeTeamIds,
        Set<Long> scopeSectorIds
) {
    /** A territorial filter limits the work to the sections it names. */
    public boolean territorial() {
        return sectorId != null || sectionId != null;
    }
}
