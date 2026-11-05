package pe.edu.pucp.hesperides.modules.reports.service;

import java.util.List;
import java.util.Set;

/**
 * Who is reading and what they may see (SPEC-202 D-07 and D-08). Computed on
 * every request from {@code teams}, never from the token (SPEC-001 Annex A).
 *
 * @param campus    ADMIN and COORDINADOR read the whole campus.
 * @param teamIds   the active teams a SUPERVISOR leads; empty for the campus roles.
 * @param sectorIds the sectors the reader may open: every active sector for the
 *                  campus roles, the {@code teams.zone_id} of their teams for a SUPERVISOR.
 */
public record ReportScope(Long userId, String roleCode, boolean campus, List<Long> teamIds, Set<Long> sectorIds) {

    public boolean canOpenSector(Long sectorId) {
        return sectorId != null && sectorIds.contains(sectorId);
    }

    /** Technical label of the response (§3.6): CAMPUS for the campus roles, TEAMS for a SUPERVISOR. */
    public String monthlyLabel() {
        return campus ? "CAMPUS" : "TEAMS";
    }
}
