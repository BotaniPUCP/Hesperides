package pe.edu.pucp.hesperides.modules.reports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse.LocationCompliance;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse.Segment;
import pe.edu.pucp.hesperides.modules.maintenance.service.ComplianceReader;
import pe.edu.pucp.hesperides.modules.maintenance.service.LocationExecution;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries.CatalogRef;
import pe.edu.pucp.hesperides.modules.reports.repository.ReportFilter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** SPEC-202 D-05 and §3.6: verdicts per place, not evaluable regimes and the filters of compliance. */
class ComplianceSummaryTest {

    private static final LocalDate FROM = LocalDate.of(2026, 10, 1);
    private static final LocalDate TO = LocalDate.of(2026, 10, 31);

    private static Segment segment(String status) {
        return new Segment(status, 1L, null, null, null, null, FROM, TO, null, false, 0, "");
    }

    private static LocationCompliance place(long zone, int lastDay, String... statuses) {
        var date = LocalDate.of(2026, 10, lastDay);
        var fact = new LocationExecution(1L, "INT-1", zone, 1, "ZONE", zone, "Jardín " + zone, zone, null,
                Instant.EPOCH, Instant.EPOCH, Instant.EPOCH, date, date);
        return new LocationCompliance("ZONE", zone, "Jardín " + zone, List.of(fact),
                java.util.Arrays.stream(statuses).map(ComplianceSummaryTest::segment).toList());
    }

    private static ComplianceResponse activity(long id, String regime, String scope, List<LocationCompliance> places) {
        return new ComplianceResponse(id, "Actividad " + id, regime, "INTERVAL_DAYS", FROM, TO,
                List.of(segment("NOT_APPLICABLE")), places, scope);
    }

    private static ReportFilter filter(Long sectorId, Long classId, Long typeId) {
        return new ReportFilter(new DateRange(FROM, TO), ZoneId.of("America/Lima"), sectorId, null, null,
                classId, typeId, true, 1L, List.of(), Set.of());
    }

    @Test
    void outsourcedAndBySectorAreNotEvaluable() {
        var outsourced = ComplianceSummary.row(activity(1, "OUTSOURCED", "CAMPUS_WIDE", List.of()), l -> true);
        var bySector = ComplianceSummary.row(activity(2, "IN_HOUSE", "BY_SECTOR", List.of()), l -> true);

        assertThat(outsourced.evaluable()).isFalse();
        assertThat(outsourced.notEvaluableReason()).isEqualTo("OUTSOURCED");
        assertThat(bySector.evaluable()).isFalse();
        assertThat(bySector.notEvaluableReason()).isEqualTo("BY_SECTOR");
    }

    @Test
    void eachPlaceTakesItsMostSevereSegment() {
        var row = ComplianceSummary.row(activity(1, "IN_HOUSE", "CAMPUS_WIDE", List.of(
                place(10, 5, "ON_TARGET", "OVERDUE"),
                place(11, 6, "ON_TARGET"),
                place(12, 7, "WITHIN_TOLERANCE", "ON_TARGET"),
                place(13, 8, "NOT_CONFIGURED"))), l -> true);

        assertThat(row.evaluable()).isTrue();
        assertThat(row.overdue()).isEqualTo(1);
        assertThat(row.onTarget()).isEqualTo(1);
        assertThat(row.withinTolerance()).isEqualTo(1);
        assertThat(row.notApplicable()).isEqualTo(1);
        assertThat(row.overdueTargets()).singleElement()
                .satisfies(t -> assertThat(t.lastExecutionDate()).isEqualTo(LocalDate.of(2026, 10, 5)));
    }

    @Test
    void overdueTargetsAreCappedAtFiveOldestFirst() {
        List<LocationCompliance> places = new ArrayList<>();
        for (int day = 7; day >= 1; day--) {
            places.add(place(100 + day, day, "OVERDUE"));
        }

        var row = ComplianceSummary.row(activity(1, "IN_HOUSE", "CAMPUS_WIDE", places), l -> true);

        assertThat(row.overdue()).isEqualTo(7);
        assertThat(row.overdueTargets()).hasSize(5);
        assertThat(row.overdueTargets().get(0).lastExecutionDate()).isEqualTo(LocalDate.of(2026, 10, 1));
    }

    @Test
    void classAndTypeSelectActivitiesAndSectorSelectsPlaces() {
        var reader = mock(ComplianceReader.class);
        var zones = mock(CoverageQueries.class);
        var catalog = mock(InterventionReportQueries.class);
        when(reader.evaluate(FROM, TO, null)).thenReturn(List.of(
                activity(30, "IN_HOUSE", "CAMPUS_WIDE", List.of(place(50, 3, "OVERDUE"), place(77, 4, "OVERDUE"))),
                activity(31, "IN_HOUSE", "CAMPUS_WIDE", List.of())));
        when(catalog.catalogItem(30L)).thenReturn(Optional.of(new CatalogRef(30L, "INTERVENTION_TYPE", 12L)));
        when(catalog.catalogItem(31L)).thenReturn(Optional.of(new CatalogRef(31L, "INTERVENTION_TYPE", 13L)));
        when(zones.sectionsOfZones(any())).thenReturn(Map.of(50L, 50L, 77L, 77L));
        when(zones.sectionsOfPlaces(any())).thenReturn(Map.of());
        var summary = new ComplianceSummary(reader, zones, catalog);

        assertThat(summary.summarize(filter(null, 12L, null), List.of())).extracting(r -> r.activityTypeItemId())
                .containsExactly(30L);
        assertThat(summary.summarize(filter(null, null, 31L), List.of())).extracting(r -> r.activityTypeItemId())
                .containsExactly(31L);
        var inSector = summary.summarize(filter(5L, null, 30L), List.of(50L)).get(0);
        assertThat(inSector.overdue()).isEqualTo(1);
        assertThat(inSector.overdueTargets()).extracting(t -> t.targetId()).containsExactly(50L);
    }
}
