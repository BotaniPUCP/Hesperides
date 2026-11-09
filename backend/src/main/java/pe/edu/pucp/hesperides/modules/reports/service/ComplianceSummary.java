package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.frequency.ComplianceStatus;
import pe.edu.pucp.hesperides.engine.reporting.VerdictAggregator;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse.LocationCompliance;
import pe.edu.pucp.hesperides.modules.maintenance.service.ComplianceReader;
import pe.edu.pucp.hesperides.modules.maintenance.service.LocationExecution;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.ActivityCompliance;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.OverdueTarget;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.ReportFilter;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Predicate;

/**
 * Compliance per activity (SPEC-202 D-05). Reuses {@link ComplianceReader}, which
 * already applies the reader's scope and the final approval; this class only
 * aggregates places and applies the report filters.
 *
 * <p>Filters (§3.6): class and type select activities; sector and section select
 * places by their section. The team does not apply: an execution per place does
 * not record the team.
 */
@Component
@RequiredArgsConstructor
public class ComplianceSummary {

    static final int OVERDUE_CAP = 5;

    private final ComplianceReader reader;
    private final CoverageQueries zones;
    private final InterventionReportQueries catalog;

    public List<ActivityCompliance> summarize(ReportFilter filter, Collection<Long> sectionIds) {
        List<ComplianceResponse> activities = reader.evaluate(filter.period().from(), filter.period().to(), null)
                .stream().filter(activityFilter(filter)).toList();
        Predicate<LocationCompliance> inTerritory = filter.territorial()
                ? territory(activities, Set.copyOf(sectionIds))
                : location -> true;
        return activities.stream().map(activity -> row(activity, inTerritory)).toList();
    }

    private Predicate<ComplianceResponse> activityFilter(ReportFilter f) {
        if (f.typeItemId() != null) {
            return activity -> f.typeItemId().equals(activity.activityTypeItemId());
        }
        if (f.classItemId() != null) {
            // A frequency may be configured on the class itself or on one of its types.
            return activity -> f.classItemId().equals(activity.activityTypeItemId())
                    || catalog.catalogItem(activity.activityTypeItemId())
                    .map(item -> f.classItemId().equals(item.parentId())).orElse(false);
        }
        return activity -> true;
    }

    /** A place belongs to the filter when its section (D-03) is one of the filtered sections. */
    private Predicate<LocationCompliance> territory(List<ComplianceResponse> activities, Set<Long> sectionIds) {
        Set<Long> zoneIds = new HashSet<>();
        Set<Long> placeIds = new HashSet<>();
        for (ComplianceResponse activity : activities) {
            for (LocationCompliance location : activity.locations()) {
                LocationExecution fact = location.executions().get(0);
                if (fact.zoneId() != null) {
                    zoneIds.add(fact.zoneId());
                } else if (fact.placeId() != null) {
                    placeIds.add(fact.placeId());
                }
            }
        }
        Map<Long, Long> byZone = zones.sectionsOfZones(zoneIds);
        Map<Long, Long> byPlace = zones.sectionsOfPlaces(placeIds);
        return location -> {
            LocationExecution fact = location.executions().get(0);
            Long section = fact.zoneId() != null ? byZone.get(fact.zoneId())
                    : fact.placeId() != null ? byPlace.get(fact.placeId()) : null;
            return section != null && sectionIds.contains(section);
        };
    }

    static ActivityCompliance row(ComplianceResponse activity, Predicate<LocationCompliance> inTerritory) {
        String reason = !"IN_HOUSE".equals(activity.regime()) ? "OUTSOURCED"
                : "BY_SECTOR".equals(activity.scope()) ? "BY_SECTOR" : null;
        if (reason != null) {
            return new ActivityCompliance(activity.activityTypeItemId(), activity.activityTypeLabel(),
                    activity.regime(), false, reason, 0, 0, 0, 0, List.of());
        }
        Map<ComplianceStatus, Integer> counts = new EnumMap<>(ComplianceStatus.class);
        List<OverdueTarget> overdue = new ArrayList<>();
        for (LocationCompliance location : activity.locations()) {
            if (!inTerritory.test(location)) {
                continue;
            }
            ComplianceStatus verdict = VerdictAggregator.mostSevere(location.segments().stream()
                    .map(segment -> ComplianceStatus.valueOf(segment.status())).toList());
            counts.merge(verdict, 1, Integer::sum);
            if (verdict == ComplianceStatus.OVERDUE) {
                overdue.add(new OverdueTarget(location.targetKind(), location.targetId(), location.targetLabel(),
                        lastExecution(location)));
            }
        }
        overdue.sort(Comparator.comparing(OverdueTarget::lastExecutionDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(OverdueTarget::label, Comparator.nullsLast(Comparator.naturalOrder())));
        return new ActivityCompliance(activity.activityTypeItemId(), activity.activityTypeLabel(), activity.regime(),
                true, null, counts.getOrDefault(ComplianceStatus.ON_TARGET, 0),
                counts.getOrDefault(ComplianceStatus.EARLY, 0),
                counts.getOrDefault(ComplianceStatus.OVERDUE, 0),
                counts.getOrDefault(ComplianceStatus.NOT_APPLICABLE, 0),
                List.copyOf(overdue.subList(0, Math.min(OVERDUE_CAP, overdue.size()))));
    }

    private static LocalDate lastExecution(LocationCompliance location) {
        return location.executions().stream().map(LocationExecution::executionDate)
                .max(Comparator.naturalOrder()).orElse(null);
    }
}
