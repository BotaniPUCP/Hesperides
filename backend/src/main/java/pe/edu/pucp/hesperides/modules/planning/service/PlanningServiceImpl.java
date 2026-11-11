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
import java.util.Map;
import java.util.Set;

/**
 * Planificación preventiva (SPEC-203 §5.5 y §5.6). Orquesta: lee conjuntos,
 * reglas y fechas por jardín y por ejemplar, y deja todo juicio al Engine. Consulta
 * las fechas una vez por actividad, para la unión de lo que tienen sus conjuntos.
 */
@Service
@Transactional(readOnly = true)
public class PlanningServiceImpl implements PlanningService {

    private final PlanningSetsQueries sets;
    private final PlanningRuleSource rules;
    private final GardenAttendanceProvider attendance;
    private final SpecimenAttendanceProvider specimens;
    private final Clock clock;
    private final ZoneId zone;

    public PlanningServiceImpl(PlanningSetsQueries sets, PlanningRuleSource rules, GardenAttendanceProvider attendance,
                               SpecimenAttendanceProvider specimens, Clock clock, @Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this.sets = sets;
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
        List<SetSnapshot> planned = sets.activeSets().stream().filter(s -> !s.isEmpty()).toList();
        Set<Long> activities = new HashSet<>();
        planned.forEach(s -> activities.addAll(s.activityTypeItemIds()));
        Map<Long, String> labels = sets.activityLabels(activities);

        List<Scored> scored = new ArrayList<>();
        for (long activity : activities) {
            List<SetSnapshot> declaring = planned.stream().filter(s -> s.activityTypeItemIds().contains(activity)).toList();
            Set<Long> zones = new HashSet<>();
            Set<Long> elements = new HashSet<>();
            declaring.forEach(s -> { zones.addAll(s.zoneIds()); elements.addAll(s.elementIds()); });
            var history = AttendanceHistory.of(attendance.completions(activity, zones),
                    specimens.specimenCompletions(activity, elements));
            var open = AttendanceHistory.rounds(attendance.openWorks(activity, zones),
                    specimens.openSpecimenWorks(activity, elements));
            for (SetSnapshot set : declaring) {
                PlanningRule rule = catalog.forSet(activity, set.id());
                FrequencyRule frequency = rule == null ? null : rule.rule();
                PlanningVerdict verdict = PlanningEvaluator.evaluate(frequency,
                        history.of(set.zoneIds(), set.elementIds()), open, today);
                String label = rule != null ? rule.activityLabel() : labels.get(activity);
                scored.add(new Scored(verdict, PlanningRows.of(set, activity, label, rule, verdict)));
            }
        }
        return scored.stream().sorted(Comparator.comparing(Scored::verdict, PlanningOrder.COMPARATOR))
                .map(Scored::row).toList();
    }

    @Override
    public List<RecentAttentionResponse> recentAttention(long activity, LocalDate scheduledDate, List<Long> zoneIds) {
        var catalog = RuleCatalog.of(rules.current());
        List<SetSnapshot> all = sets.activeSets();
        // Lo hecho después de la fecha programada no hace «reciente» a esa fecha.
        var history = AttendanceHistory.of(attendance.completions(activity, zoneIds).stream()
                .filter(c -> !c.date().isAfter(scheduledDate)).toList(), List.of());
        Map<Long, String> names = sets.displayNames(zoneIds);
        List<RecentAttentionResponse> out = new ArrayList<>();
        for (long zoneId : new HashSet<>(zoneIds)) {
            LocalDate last = history.lastOf(zoneId);
            if (last == null) continue;
            List<FrequencyRule> own = ownRulesOf(catalog, all, activity, zoneId);
            FrequencyRule effective = EffectiveRule.forGarden(own, catalog.generalRule(activity), last);
            if (effective == null) continue;
            EffectiveRule.recentMinDays(effective, last, scheduledDate).ifPresent(min -> out.add(new RecentAttentionResponse(
                    zoneId, names.get(zoneId), last, (int) ChronoUnit.DAYS.between(last, scheduledDate), min)));
        }
        out.sort(Comparator.comparing(RecentAttentionResponse::displayName, Comparator.nullsLast(String::compareTo)));
        return out;
    }

    private static List<FrequencyRule> ownRulesOf(RuleCatalog catalog, Collection<SetSnapshot> all, long activity,
                                                  long zoneId) {
        return all.stream().filter(s -> s.zoneIds().contains(zoneId))
                .map(s -> catalog.ownRule(activity, s.id())).filter(java.util.Objects::nonNull)
                .map(PlanningRule::rule).toList();
    }
}
