package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.Assignment;

import pe.edu.pucp.hesperides.engine.planning.OpenRound;
import pe.edu.pucp.hesperides.engine.planning.PlanningVerdict;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse.OpenIntervention;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries.SetSnapshot;

/** Arma la fila de respuesta de §3.2 a partir del veredicto del Engine. */
final class PlanningRows {

    private PlanningRows() {
    }

    static PlanningRowResponse of(SetSnapshot set, Assignment assignment, String label, PlanningRule rule, PlanningVerdict v) {
        OpenRound round = v.openRound();
        OpenIntervention open = round == null ? null
                : new OpenIntervention(round.interventionId(), round.code(), round.scheduledDate(), round.firstStartedDate());
        return new PlanningRowResponse(set.id(), set.name(), set.zoneIds().size(), set.elementIds().size(),
                assignment.activityId(), label, rule == null ? null : rule.rule().ruleTypeCode(), rule != null && !rule.campusWide(), v.rhythm(),
                v.state(), v.days(), v.lastDate(), v.daysSinceLast(), v.progress(), v.neverAttendedCount(), open,
                v.estimatedDate(), v.yearCount(), v.suggestedDate(), assignment.id(), assignment.ruleKey());
    }
}
