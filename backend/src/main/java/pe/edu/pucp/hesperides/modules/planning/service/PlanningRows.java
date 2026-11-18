package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.Assignment;

import pe.edu.pucp.hesperides.engine.planning.GardenHistory;
import pe.edu.pucp.hesperides.engine.planning.OpenRound;
import pe.edu.pucp.hesperides.engine.planning.PlanningState;
import pe.edu.pucp.hesperides.engine.planning.PlanningVerdict;
import pe.edu.pucp.hesperides.engine.planning.UnitBreakdown;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse.LastDateCount;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse.OpenIntervention;

import java.time.LocalDate;
import java.util.List;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries.SetSnapshot;

/** Arma la fila de respuesta de §3.2 a partir del veredicto del Engine. */
final class PlanningRows {

    private PlanningRows() {
    }

    static PlanningRowResponse of(SetSnapshot set, Assignment assignment, String label, PlanningRule rule, PlanningVerdict v,
                                  UnitBreakdown units, List<GardenHistory> history) {
        OpenRound round = v.openRound();
        // Un ejemplar entra al Engine con su id en negativo (AttendanceHistory): así se separan por tipo.
        int neverElements = v.neverAttendedCount() == 0 ? 0
                : (int) history.stream().filter(u -> u.zoneId() < 0 && u.last() == null).count();
        LocalDate started = round == null ? null : round.firstStartedDate();
        Integer remainingElements = v.state() != PlanningState.IN_PROGRESS || started == null ? null
                : (int) history.stream().filter(u -> u.zoneId() < 0 && (u.last() == null || u.last().isBefore(started))).count();
        OpenIntervention open = round == null ? null
                : new OpenIntervention(round.interventionId(), round.code(), round.scheduledDate(), round.firstStartedDate());
        return new PlanningRowResponse(set.id(), set.name(), set.zoneIds().size(), set.elementIds().size(),
                assignment.activityId(), label, rule == null ? null : rule.rule().ruleTypeCode(), rule != null && !rule.campusWide(), v.rhythm(),
                v.state(), v.days(), v.lastDate(), v.daysSinceLast(), v.progress(), v.neverAttendedCount(), open,
                v.estimatedDate(), v.yearCount(), v.suggestedDate(), assignment.id(), assignment.ruleKey(),
                units == null ? null : units.upToDate(),
                units == null ? List.of() : units.lastDates().stream().map(d -> new LastDateCount(d.date(), d.count())).toList(),
                units == null ? List.of() : units.pendingUnits().stream().filter(u -> u > 0).toList(),
                units == null ? List.of() : units.pendingUnits().stream().filter(u -> u < 0).map(u -> -u).toList(),
                neverElements, remainingElements);
    }
}
