package pe.edu.pucp.hesperides.modules.reports.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Monthly report of the section (SPEC-202 §3.4). Codes, never texts: the UI translates them. */
public record MonthlyReportResponse(
        Period period,
        String scope,
        Coverage coverage,
        Interventions interventions,
        Incidents incidents,
        List<SectorRow> sectors,
        List<ActivityCompliance> compliance,
        TopList<SectionRow> mostAttended,
        TopList<SectionRow> unattended,
        Instant generatedAt
) {
    public static final String COVERAGE_RULE = "PROVISIONAL_ONE_APPROVED_PER_SECTION";
    public static final String NO_SECTOR_ASSIGNED = "NO_SECTOR_ASSIGNED";

    public record Period(LocalDate dateFrom, LocalDate dateTo, String timeZone) {
    }

    public record Coverage(String rule, boolean available, String unavailableReason,
                           BigDecimal coveredAreaM2, BigDecimal totalAreaM2, BigDecimal percent,
                           int coveredSections, int totalSections, int sectionsWithoutArea) {
    }

    public record Interventions(long approved, long pendingApproval) {
    }

    public record Incidents(long pendingApproval, long open, long inProgress,
                            long reportedInPeriod, long resolvedInPeriod) {
    }

    /** {@code sectorId} null is the "no sector" row. */
    public record SectorRow(Long sectorId, String code, String name,
                            BigDecimal coveredAreaM2, BigDecimal totalAreaM2, BigDecimal percent,
                            int coveredSections, int totalSections, long approvedInterventions) {
    }

    public record ActivityCompliance(Long activityTypeItemId, String activityLabel, String regime,
                                     boolean evaluable, String notEvaluableReason,
                                     int onTarget, int withinTolerance, int overdue, int notApplicable,
                                     List<OverdueTarget> overdueTargets) {
    }

    public record OverdueTarget(String targetKind, Long targetId, String label, LocalDate lastExecutionDate) {
    }

    public record SectionRow(Long sectionId, String code, String name, String sectorName,
                             BigDecimal areaM2, long approvedInterventions, LocalDate lastAttendedOn) {
    }
}
