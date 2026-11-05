package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.Coverage;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.Incidents;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.Interventions;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.Period;
import pe.edu.pucp.hesperides.modules.reports.dto.TopList;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;
import pe.edu.pucp.hesperides.modules.reports.repository.IncidentReportQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.IncidentReportQueries.MonthlyCounters;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.ReportFilter;

import java.time.LocalDate;
import java.util.List;

/** Builds the monthly report of the section (SPEC-202 §3.4) from a validated filter. */
@Component
@RequiredArgsConstructor
public class MonthlyReportBuilder {

    private final CoverageQueries coverage;
    private final InterventionReportQueries interventions;
    private final IncidentReportQueries incidents;
    private final ReportCalendar calendar;

    public MonthlyReportResponse build(ReportFilter filter, ReportScope scope) {
        List<SectionRef> sections = coverage.denominator(filter);
        var stats = CoverageAssembler.stats(sections, coverage.attendance(filter));
        // D-08: a SUPERVISOR whose teams have no sector has nothing to measure coverage against.
        Coverage summary = !scope.campus() && scope.sectorIds().isEmpty()
                ? CoverageAssembler.unavailable(MonthlyReportResponse.NO_SECTOR_ASSIGNED)
                : CoverageAssembler.coverage(stats.values());
        List<Long> sectionIds = sections.stream().map(SectionRef::sectionId).toList();
        var work = new Interventions(interventions.approvedCount(filter, sectionIds),
                interventions.pendingApprovalCount(filter, sectionIds));
        return new MonthlyReportResponse(
                new Period(filter.period().from(), filter.period().to(), filter.zone().getId()),
                scope.monthlyLabel(), summary, work, incidents(filter),
                CoverageAssembler.sectorRows(stats.values()),
                List.of(), new TopList<>(0, List.of()), new TopList<>(0, List.of()),
                calendar.now());
    }

    /** States are taken at the end of the period, or today while the period is still running. */
    private Incidents incidents(ReportFilter filter) {
        LocalDate today = calendar.today();
        LocalDate cutoff = filter.period().to().isAfter(today) ? today : filter.period().to();
        MonthlyCounters c = incidents.monthlyCounters(filter, cutoff);
        return new Incidents(c.pendingApproval(), c.open(), c.inProgress(), c.reportedInPeriod(), c.resolvedInPeriod());
    }
}
