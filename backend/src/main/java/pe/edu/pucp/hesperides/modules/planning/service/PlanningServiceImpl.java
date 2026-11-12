package pe.edu.pucp.hesperides.modules.planning.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.planning.EffectiveRule;
import pe.edu.pucp.hesperides.engine.planning.PlanningEvaluator;
import pe.edu.pucp.hesperides.engine.planning.PlanningOrder;
import pe.edu.pucp.hesperides.engine.planning.PlanningVerdict;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.dto.RecentAttentionResponse;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.Assignment;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries.SetSnapshot;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Planificación preventiva (SPEC-203 §5.5 y §5.6). Orquesta: lee las asignaciones,
 * sus conjuntos, reglas y fechas por jardín y por ejemplar, y deja todo juicio al Engine. Consulta
 * las fechas una vez por actividad, para la unión de lo que tienen sus conjuntos.
 */
@Service
@Transactional(readOnly = true)
public class PlanningServiceImpl implements PlanningService {

    private final PlanningSetsQueries sets;
    private final PlanningAssignmentsQueries assignments;
    private final PlanningRuleSource rules;
    private final GardenAttendanceProvider attendance;
    private final SpecimenAttendanceProvider specimens;
    private final Clock clock;
    private final ZoneId zone;

    public PlanningServiceImpl(PlanningSetsQueries sets, PlanningAssignmentsQueries assignments, PlanningRuleSource rules, GardenAttendanceProvider attendance,
                               SpecimenAttendanceProvider specimens, Clock clock, @Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this.sets = sets;
        this.assignments = assignments;
        this.rules = rules;
        this.attendance = attendance;
        this.specimens = specimens;
        this.clock = clock;
        this.zone = ZoneId.of(timeZone);
    }

    private record Scored(PlanningVerdict verdict, PlanningRowResponse row) {
    }

    @Override
    public List<PlanningRowResponse> rows() {
        LocalDate today = ReportPeriods.today(clock, zone);
        var catalog = RuleCatalog.of(rules.current());
        Map<Long, SetSnapshot> planned = new HashMap<>();
        sets.activeSets().stream().filter(s -> !s.isEmpty()).forEach(s -> planned.put(s.id(), s));
        List<Assignment> active = assignments.active().stream().filter(a -> planned.containsKey(a.setId())).toList();
        Set<Long> activities = new HashSet<>();
        active.forEach(a -> activities.add(a.activityId()));

        List<Scored> scored = new ArrayList<>();
        for (long activity : activities) {
            List<Assignment> ofActivity = active.stream().filter(a -> a.activityId() == activity).toList();
            Set<Long> zones = new HashSet<>();
            Set<Long> elements = new HashSet<>();
            ofActivity.forEach(a -> { zones.addAll(planned.get(a.setId()).zoneIds()); elements.addAll(planned.get(a.setId()).elementIds()); });
            var history = AttendanceHistory.of(attendance.completions(activity, zones),
                    specimens.specimenCompletions(activity, elements));
            var open = AttendanceHistory.rounds(attendance.openWorks(activity, zones),
                    specimens.openSpecimenWorks(activity, elements));
            for (Assignment a : ofActivity) {
                SetSnapshot set = planned.get(a.setId());
                PlanningRule rule = catalog.byKey(a.ruleKey());
                FrequencyRule frequency = rule == null ? null : rule.rule();
                PlanningVerdict verdict = PlanningEvaluator.evaluate(frequency,
                        history.of(set.zoneIds(), set.elementIds()), open, today);
                String label = rule != null ? rule.activityLabel() : a.activityLabel();
                scored.add(new Scored(verdict, PlanningRows.of(set, a, label, rule, verdict)));
            }
        }
        return scored.stream().sorted(Comparator.comparing(Scored::verdict, PlanningOrder.COMPARATOR))
                .map(Scored::row).toList();
    }

    @Override
    public List<RecentAttentionResponse> recentAttention(long activity, LocalDate scheduledDate, List<Long> zoneIds) {
        var catalog = RuleCatalog.of(rules.current());
        List<SetSnapshot> all = sets.activeSets();
        Map<Long, Assignment> assigned = new HashMap<>();
        assignments.active().stream().filter(a -> a.activityId() == activity).forEach(a -> assigned.put(a.setId(), a));
        // Lo hecho después de la fecha programada no hace «reciente» a esa fecha.
        var history = AttendanceHistory.of(attendance.completions(activity, zoneIds).stream()
                .filter(c -> !c.date().isAfter(scheduledDate)).toList(), List.of());
        Map<Long, String> names = sets.displayNames(zoneIds);
        List<RecentAttentionResponse> out = new ArrayList<>();
        for (long zoneId : new HashSet<>(zoneIds)) {
            LocalDate last = history.lastOf(zoneId);
            if (last == null) continue;
            List<FrequencyRule> own = ownRulesOf(catalog, all, assigned, zoneId);
            FrequencyRule effective = EffectiveRule.forGarden(own, catalog.generalRule(activity), last);
            if (effective == null) continue;
            EffectiveRule.recentMinDays(effective, last, scheduledDate).ifPresent(min -> out.add(new RecentAttentionResponse(
                    zoneId, names.get(zoneId), last, (int) ChronoUnit.DAYS.between(last, scheduledDate), min)));
        }
        out.sort(Comparator.comparing(RecentAttentionResponse::displayName, Comparator.nullsLast(String::compareTo)));
        return out;
    }

    /** Las reglas asignadas, para esta actividad, a los conjuntos que contienen el jardín. */
    private static List<FrequencyRule> ownRulesOf(RuleCatalog catalog, Collection<SetSnapshot> all,
                                                  Map<Long, Assignment> assigned, long zoneId) {
        return all.stream().filter(s -> s.zoneIds().contains(zoneId))
                .map(s -> assigned.get(s.id())).filter(java.util.Objects::nonNull)
                .map(a -> catalog.byKey(a.ruleKey())).filter(java.util.Objects::nonNull)
                .map(PlanningRule::rule).toList();
    }
}
