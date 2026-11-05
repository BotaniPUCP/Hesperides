package pe.edu.pucp.hesperides.modules.reports.service;

import pe.edu.pucp.hesperides.engine.reporting.CoverageCalculator;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.Coverage;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse.SectorRow;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.Attendance;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Joins the denominator with the attendance (SPEC-202 D-01, D-04). Pure: no
 * queries, so the counting rules are visible in one place.
 *
 * <p>A section is covered once, however many works reached it; each work still
 * counts in {@code approvedInterventions}. A section without area counts as a
 * section but never in the areas.
 */
final class CoverageAssembler {

    static final String NO_SECTOR_NAME = "Sin sector";

    private CoverageAssembler() {
    }

    /** One section of the denominator with the works that reached it in the period. */
    record SectionStats(SectionRef section, Set<Long> works, LocalDate lastAttendedOn) {
        boolean covered() {
            return !works.isEmpty();
        }
    }

    static Map<Long, SectionStats> stats(List<SectionRef> sections, List<Attendance> attendance) {
        Map<Long, Set<Long>> works = new HashMap<>();
        Map<Long, LocalDate> last = new HashMap<>();
        for (Attendance a : attendance) {
            works.computeIfAbsent(a.sectionId(), id -> new HashSet<>()).add(a.workId());
            last.merge(a.sectionId(), a.attendedOn(), (x, y) -> x.isAfter(y) ? x : y);
        }
        Map<Long, SectionStats> stats = new LinkedHashMap<>();
        for (SectionRef s : sections) {
            stats.put(s.sectionId(), new SectionStats(s, works.getOrDefault(s.sectionId(), Set.of()),
                    last.get(s.sectionId())));
        }
        return stats;
    }

    static Coverage coverage(Collection<SectionStats> stats) {
        Totals t = totals(stats);
        return new Coverage(MonthlyReportResponse.COVERAGE_RULE, true, null,
                CoverageCalculator.area(t.coveredArea), CoverageCalculator.area(t.totalArea),
                CoverageCalculator.percent(t.coveredArea, t.totalArea),
                t.coveredSections, t.totalSections, t.withoutArea);
    }

    static Coverage unavailable(String reason) {
        return new Coverage(MonthlyReportResponse.COVERAGE_RULE, false, reason,
                CoverageCalculator.area(null), CoverageCalculator.area(null), null, 0, 0, 0);
    }

    /** One row per current sector (D-12), alphabetical, with the "no sector" row last. */
    static List<SectorRow> sectorRows(Collection<SectionStats> stats) {
        Map<Long, List<SectionStats>> bySector = new HashMap<>();
        List<SectionStats> withoutSector = new ArrayList<>();
        for (SectionStats s : stats) {
            Long sector = s.section().sectorId();
            if (sector == null) {
                withoutSector.add(s);
            } else {
                bySector.computeIfAbsent(sector, id -> new ArrayList<>()).add(s);
            }
        }
        List<SectorRow> rows = new ArrayList<>(bySector.values().stream().map(CoverageAssembler::row)
                .sorted(Comparator.comparing(SectorRow::name, String.CASE_INSENSITIVE_ORDER)).toList());
        if (!withoutSector.isEmpty()) {
            rows.add(row(withoutSector));
        }
        return rows;
    }

    private static SectorRow row(List<SectionStats> sections) {
        SectionRef first = sections.get(0).section();
        Totals t = totals(sections);
        long works = sections.stream().flatMap(s -> s.works().stream()).distinct().count();
        return new SectorRow(first.sectorId(), first.sectorCode(),
                first.sectorId() == null ? NO_SECTOR_NAME : first.sectorName(),
                CoverageCalculator.area(t.coveredArea), CoverageCalculator.area(t.totalArea),
                CoverageCalculator.percent(t.coveredArea, t.totalArea),
                t.coveredSections, t.totalSections, works);
    }

    private record Totals(BigDecimal coveredArea, BigDecimal totalArea,
                          int coveredSections, int totalSections, int withoutArea) {
    }

    private static Totals totals(Collection<SectionStats> stats) {
        BigDecimal covered = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        int coveredSections = 0;
        int withoutArea = 0;
        for (SectionStats s : stats) {
            BigDecimal area = s.section().areaM2();
            if (s.covered()) {
                coveredSections++;
            }
            if (area == null) {
                withoutArea++;
                continue;
            }
            total = total.add(area);
            if (s.covered()) {
                covered = covered.add(area);
            }
        }
        return new Totals(covered, total, coveredSections, stats.size(), withoutArea);
    }
}
