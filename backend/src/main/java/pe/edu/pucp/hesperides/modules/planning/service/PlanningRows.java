package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.Assignment;

import pe.edu.pucp.hesperides.engine.planning.OpenRound;
import pe.edu.pucp.hesperides.engine.planning.PlanningVerdict;
import pe.edu.pucp.hesperides.engine.planning.UnitBreakdown;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse.LastDateCount;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse.OpenIntervention;

import java.util.List;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries.SetSnapshot;

/** Arma la fila de respuesta de §3.2 a partir del veredicto del Engine. */
final class PlanningRows {

    private PlanningRows() {
    }

    static PlanningRowResponse of(SetSnapshot set, Assignment assignment, String label, PlanningRule rule, PlanningVerdict v,
                                  UnitBreakdown units) {
        OpenRound round = v.openRound();
        OpenIntervention open = round == null ? null
                : new OpenIntervention(round.interventionId(), round.code(), round.scheduledDate(), round.firstStartedDate());
        return new PlanningRowResponse(set.id(), set.name(), set.zoneIds().size(), set.elementIds().size(),
                assignment.activityId(), label, rule == null ? null : rule.rule().ruleTypeCode(), rule != null && !rule.campusWide(), v.rhythm(),
                v.state(), v.days(), v.lastDate(), v.daysSinceLast(), v.progress(), v.neverAttendedCount(), open,
                v.estimatedDate(), v.yearCount(), v.suggestedDate(), assignment.id(), assignment.ruleKey(),
                units == null ? null : units.upToDate(),
                units == null ? List.of() : units.lastDates().stream().map(d -> new LastDateCount(d.date(), d.count())).toList(),
                units == null ? List.of() : units.pendingUnits().stream().filter(u -> u > 0).toList(),
                // Un ejemplar entra al Engine con su id en negativo (AttendanceHistory): se devuelve el suyo.
                units == null ? List.of() : units.pendingUnits().stream().filter(u -> u < 0).map(u -> -u).toList());
    }
}
