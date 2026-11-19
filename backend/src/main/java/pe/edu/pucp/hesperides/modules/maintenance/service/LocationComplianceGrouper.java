package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.engine.frequency.ComplianceResult;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyEvaluator;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.planning.EffectiveRule;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse.LocationCompliance;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Cumplimiento por lugar de una actividad de personal propio (SPEC-203 §5.8).
 * Cada jardín se juzga con una sola regla, su regla efectiva: la de menor mínimo
 * entre las asignadas a sus conjuntos o, si no tiene, la de todo el campus. Un jardín sin
 * regla efectiva no aparece.
 */
final class LocationComplianceGrouper {

    private static final String CAMPUS_WIDE = "CAMPUS_WIDE";
    private static final String BY_SET = "BY_SET";

    /** Lo que ya se leyó de la base para una actividad. */
    record Inputs(List<MaintenanceFrequency> current, List<MaintenanceFrequency> overlapping,
                  List<LocationExecution> facts, Map<Long, Set<UUID>> assignedRulesByZone, Map<Long, Long> placeSection) {
    }

    private LocationComplianceGrouper() {
    }

    static List<LocationCompliance> evaluate(Inputs in, LocalDate from, LocalDate to) {
        var groups = new LinkedHashMap<String, List<LocationExecution>>();
        for (var fact : in.facts()) {
            groups.computeIfAbsent(fact.targetKind() + ":" + fact.targetId(), key -> new ArrayList<>()).add(fact);
        }
        MaintenanceFrequency general = in.current().stream().filter(f -> CAMPUS_WIDE.equals(f.getScope())).findFirst().orElse(null);
        var locations = new ArrayList<LocationCompliance>();
        for (var facts : groups.values()) {
            var first = facts.get(0);
            MaintenanceFrequency rule = effective(in, general, section(first, in.placeSection()), to);
            if (rule == null) continue;
            List<ComplianceResult> results = "LOCATION".equals(first.targetKind())
                    ? List.of(ComplianceResult.notApplicable(rule.getId(), from, to, null,
                        "La evaluación requiere una referencia estable de lugar/sección y alcance territorial confirmado"))
                    : judge(versionsOf(rule, in.overlapping()), onePerWork(facts), from, to);
            locations.add(new LocationCompliance(first.targetKind(), first.targetId(), first.targetLabel(), facts,
                    results.stream().map(ComplianceResponse.Segment::from).toList()));
        }
        return locations;
    }

    private static List<ComplianceResult> judge(List<FrequencyRule> versions, List<LocalDate> dates,
                                                LocalDate from, LocalDate to) {
        return versions.isEmpty() ? List.of(ComplianceResult.notConfigured(from, to))
                : FrequencyEvaluator.evaluateAcrossVersions(versions, dates, from, to);
    }

    private static Long section(LocationExecution fact, Map<Long, Long> placeSection) {
        return fact.zoneId() != null ? fact.zoneId() : fact.placeId() == null ? null : placeSection.get(fact.placeId());
    }

    private static MaintenanceFrequency effective(Inputs in, MaintenanceFrequency general, Long section, LocalDate at) {
        Set<UUID> assigned = section == null ? Set.of() : in.assignedRulesByZone().getOrDefault(section, Set.of());
        List<FrequencyRule> own = in.current().stream()
                .filter(f -> BY_SET.equals(f.getScope()) && assigned.contains(f.getRuleKey()))
                .map(MaintenanceFrequency::toRule).toList();
        FrequencyRule chosen = EffectiveRule.forGarden(own, general == null ? null : general.toRule(), at);
        if (chosen == null) return null;
        return in.current().stream().filter(f -> Objects.equals(f.getId(), chosen.configId())).findFirst().orElse(null);
    }

    /** Cada tramo se juzga con la versión que regía entonces, de esa misma regla. */
    private static List<FrequencyRule> versionsOf(MaintenanceFrequency rule, List<MaintenanceFrequency> overlapping) {
        return overlapping.stream().filter(f -> Objects.equals(rule.getRegime(), f.getRegime())
                        && Objects.equals(rule.getRuleKey(), f.getRuleKey()))
                .map(MaintenanceFrequency::toRule).toList();
    }

    /**
     * Una actividad en un mismo lugar puede tener varias unidades: cuenta una vez,
     * en su último completado ahí; trabajos distintos el mismo día siguen siendo distintos.
     */
    private static List<LocalDate> onePerWork(List<LocationExecution> facts) {
        var byWork = new LinkedHashMap<Long, LocalDate>();
        for (var fact : facts) byWork.merge(fact.interventionId(), fact.executionDate(), (a, b) -> a.isAfter(b) ? a : b);
        return new ArrayList<>(byWork.values());
    }
}
