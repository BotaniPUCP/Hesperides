package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.reporting.CoverageCalculator;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.TopList;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.*;
import pe.edu.pucp.hesperides.modules.reports.repository.*;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;
import pe.edu.pucp.hesperides.modules.reports.repository.WeeklyWorkQueries.WorkLocationRow;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Builds the weekly report of a sector (SPEC-202 §3.3) for a validated week and sector. */
@Component
@RequiredArgsConstructor
public class WeeklyReportBuilder {

    private final CoverageQueries coverage;
    private final InterventionReportQueries interventions;
    private final WeeklyWorkQueries work;
    private final IrrigationReportQueries irrigation;
    private final WeeklyIncidentQueries incidents;
    private final IrrigationZoneQueries zones;
    private final ReportCalendar calendar;

    public WeeklyReportResponse build(LocalDate weekStart, Long sectorId, ReportScope scope) {
        LocalDate today = calendar.today();
        DateRange week = new DateRange(weekStart, ReportPeriods.weekEnd(weekStart));
        boolean inProgress = !today.isAfter(week.to());
        LocalDate cutoff = inProgress ? today : week.to();
        ReportFilter filter = filter(week, sectorId, scope);

        List<SectionRef> sections = coverage.denominator(filter);
        List<Long> sectionIds = sections.stream().map(SectionRef::sectionId).toList();
        var stats = CoverageAssembler.stats(sections, coverage.attendance(filter), week);
        int covered = (int) stats.values().stream().filter(CoverageAssembler.SectionStats::covered).count();

        List<WorkLocationRow> rows = work.approvedLocations(filter, sectionIds);
        List<WorkRow> works = WeeklyAssembler.works(rows);
        DateRange previous = new DateRange(week.from().minusWeeks(1), week.to().minusWeeks(1));
        var workBlock = new Interventions(works.size(),
                interventions.approvedCount(filter(previous, sectorId, scope), sectionIds),
                interventions.pendingApprovalCount(filter, sectionIds),
                work.pendingPhotos(filter, sectionIds),
                WeeklyAssembler.byType(works, rows), WeeklyAssembler.items(works));

        return new WeeklyReportResponse(
                new Week(week.from(), week.to(), calendar.zone().getId(), inProgress, cutoff),
                scope.campus() ? "SECTOR" : "TEAMS",
                sector(sectorId, sections),
                work.teamsOfSector(sectorId, filter).stream()
                        .map(t -> new TeamRow(t.id(), t.name(), t.supervisorName())).toList(),
                workBlock,
                new AttendedSections(MonthlyReportResponse.COVERAGE_RULE, covered, sections.size(),
                        CoverageCalculator.percent(covered, sections.size())),
                irrigation(sectorId, week, sections),
                incidents(filter, sectorId, cutoff, scope),
                calendar.now());
    }

    private Sector sector(Long sectorId, List<SectionRef> sections) {
        var ref = zones.sectors().stream().filter(s -> Objects.equals(s.id(), sectorId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Sector no disponible"));
        BigDecimal area = sections.stream().map(SectionRef::areaM2).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Sector(ref.id(), ref.code(), ref.name(), sections.size(), CoverageCalculator.area(area));
    }

    /** Without any turn in the week the percent is null, never 0 % (D-15). */
    private Irrigation irrigation(Long sectorId, DateRange week, List<SectionRef> sections) {
        long turns = irrigation.turns(sectorId, week);
        Set<Long> irrigated = irrigation.irrigatedSections(sectorId, week);
        int count = (int) sections.stream().filter(s -> irrigated.contains(s.sectionId())).count();
        return new Irrigation(WeeklyReportResponse.IRRIGATION_RULE, turns, count, sections.size(),
                turns == 0 ? null : CoverageCalculator.percent(count, sections.size()),
                WeeklyAssembler.notIrrigated(sections, irrigated, irrigation.lastIrrigated(sectorId, week.to())));
    }

    private Incidents incidents(ReportFilter filter, Long sectorId, LocalDate cutoff, ReportScope scope) {
        var rows = incidents.openAtCutoff(filter, sectorId, cutoff);
        var located = rows.stream().filter(r -> sectorId.equals(r.sectorId())).toList();
        long open = located.stream().filter(r -> !"PENDING_APPROVAL".equals(r.statusCode())).count();
        long unlocated = rows.stream()
                .filter(r -> r.sectorId() == null && !"PENDING_APPROVAL".equals(r.statusCode())).count();
        var items = located.stream().map(r -> WeeklyAssembler.incident(r, cutoff)).toList();
        return new Incidents(cutoff, open, located.size() - open, scope.campus() ? unlocated : null,
                TopList.of(items, WeeklyAssembler.INCIDENTS_CAP));
    }

    private ReportFilter filter(DateRange period, Long sectorId, ReportScope scope) {
        return new ReportFilter(period, calendar.zone(), sectorId, null, null, null, null,
                scope.campus(), scope.userId(), scope.teamIds(), scope.sectorIds());
    }
}
