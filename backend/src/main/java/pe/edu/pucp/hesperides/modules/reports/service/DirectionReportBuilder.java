package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.reporting.CoverageCalculator;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse.*;
import pe.edu.pucp.hesperides.modules.reports.repository.*;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.Attendance;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;
import pe.edu.pucp.hesperides.modules.reports.service.DirectionIndicators.Measure;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Builds the direction summary of a month (SPEC-202 §3.5). Always the whole
 * campus, with the current sectors and areas (D-12). A month "has records" when
 * the campus had approved work in it: otherwise its series point is a gap and,
 * for the following month, every {@code previousValue} is null (§5.3).
 */
@Component
@RequiredArgsConstructor
public class DirectionReportBuilder {

    static final int SERIES_MONTHS = 6;

    private final CoverageQueries coverage;
    private final InterventionReportQueries interventions;
    private final IrrigationReportQueries irrigation;
    private final IncidentReportQueries incidents;
    private final InventoryReportQueries inventory;
    private final SystemParameterReader parameters;
    private final ReportCalendar calendar;

    public DirectionReportResponse build(YearMonth month) {
        YearMonth previous = month.minusMonths(1);
        List<SectionRef> sections = coverage.denominator(campus(month));
        List<Attendance> attendance = coverage.attendance(campus(month));
        BigDecimal coverageTarget = target(SystemParameterCodes.REPORT_COVERAGE_TARGET_PERCENT);

        List<SeriesPoint> points = new ArrayList<>();
        List<Long> approved = new ArrayList<>();
        for (int back = SERIES_MONTHS - 1; back >= 0; back--) {
            YearMonth m = month.minusMonths(back);
            long count = interventions.approvedCount(campus(m), List.of());
            approved.add(count);
            points.add(new SeriesPoint(m.toString(), count > 0 ? coveragePercent(sections, attendance, m) : null,
                    count > 0));
        }
        boolean previousRecorded = points.get(SERIES_MONTHS - 2).recorded();

        var indicators = new ArrayList<Indicator>();
        indicators.add(DirectionIndicators.withTarget("COVERAGE", measure(
                coveragePercent(sections, attendance, month), coveragePercent(sections, attendance, previous),
                previousRecorded), coverageTarget, true));
        indicators.add(DirectionIndicators.withTarget("IRRIGATION_COVERAGE", measure(
                irrigationPercent(sections, month), irrigationPercent(sections, previous), previousRecorded),
                target(SystemParameterCodes.REPORT_IRRIGATION_TARGET_PERCENT), true));
        indicators.add(DirectionIndicators.neutralCount("APPROVED_INTERVENTIONS", measure(
                count(approved.get(SERIES_MONTHS - 1)), count(approved.get(SERIES_MONTHS - 2)), previousRecorded)));
        indicators.add(DirectionIndicators.neutralCount("RESOLVED_INCIDENTS", measure(
                count(incidents.resolvedIn(ReportPeriods.month(month), calendar.zone())),
                count(incidents.resolvedIn(ReportPeriods.month(previous), calendar.zone())), previousRecorded)));
        indicators.add(DirectionIndicators.countWithoutStoredTarget("TREE_INVENTORY", measure(
                count(inventory.treesRegisteredBy(month.atEndOfMonth(), calendar.zone())),
                count(inventory.treesRegisteredBy(previous.atEndOfMonth(), calendar.zone())), previousRecorded)));
        indicators.addAll(DirectionIndicators.unavailable());

        return new DirectionReportResponse(month.toString(), previous.toString(), calendar.zone().getId(),
                month.equals(YearMonth.from(calendar.today())), header(sections), List.copyOf(indicators),
                new CoverageSeries(coverageTarget, List.copyOf(points)), calendar.now());
    }

    private Header header(List<SectionRef> sections) {
        BigDecimal area = sections.stream().map(SectionRef::areaM2).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Header(CoverageCalculator.area(area),
                parameters.readDecimal(SystemParameterCodes.CAMPUS_TOTAL_HECTARES).orElse(null),
                sections.size(), inventory.activeTeams());
    }

    private static BigDecimal coveragePercent(List<SectionRef> sections, List<Attendance> attendance, YearMonth m) {
        var stats = CoverageAssembler.stats(sections, attendance, ReportPeriods.month(m));
        return CoverageAssembler.coverage(stats.values()).percent();
    }

    /** Same weighting as coverage: by area, over the same sections (D-15, §2.6 row 22). */
    private BigDecimal irrigationPercent(List<SectionRef> sections, YearMonth m) {
        Set<Long> irrigated = irrigation.irrigatedSections(null, ReportPeriods.month(m));
        BigDecimal covered = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        for (SectionRef s : sections) {
            if (s.areaM2() == null) {
                continue;
            }
            total = total.add(s.areaM2());
            if (irrigated.contains(s.sectionId())) {
                covered = covered.add(s.areaM2());
            }
        }
        return CoverageCalculator.percent(covered, total);
    }

    private static Measure measure(BigDecimal value, BigDecimal previous, boolean previousRecorded) {
        return new Measure(value, previousRecorded ? previous : null);
    }

    private static BigDecimal count(long value) {
        return BigDecimal.valueOf(value);
    }

    private BigDecimal target(String code) {
        return parameters.readDecimal(code).filter(value -> value.signum() > 0).orElse(null);
    }

    private ReportFilter campus(YearMonth m) {
        DateRange period = ReportPeriods.month(m);
        return new ReportFilter(period, calendar.zone(), null, null, null, null, null,
                true, null, List.of(), Set.of());
    }
}
