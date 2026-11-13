package pe.edu.pucp.hesperides.modules.reports.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Weekly report of the sector (SPEC-202 §3.3). Codes, never texts: the UI translates them. */
public record WeeklyReportResponse(
        Week week,
        String scope,
        Sector sector,
        List<TeamRow> teams,
        Interventions interventions,
        AttendedSections attendedSections,
        Irrigation irrigation,
        Incidents incidents,
        Instant generatedAt
) {
    public static final String IRRIGATION_RULE = "PROVISIONAL_ONE_TURN_PER_SECTION";

    /** {@code cutoffDate} is the Sunday, or today while the week is still running. */
    public record Week(LocalDate weekStart, LocalDate weekEnd, String timeZone, boolean inProgress,
                       LocalDate cutoffDate) {
    }

    public record Sector(Long id, String code, String name, int totalSections, BigDecimal totalAreaM2) {
    }

    public record TeamRow(Long id, String name, String supervisorName) {
    }

    public record Interventions(long approved, long approvedPreviousWeek, long pendingApproval, long pendingPhotos,
                                List<TypeRow> byType, TopList<WorkRow> items) {
    }

    public record TypeRow(String classLabel, Long typeItemId, String typeLabel, long approved, List<String> places) {
    }

    public record WorkRow(Long id, String code, String classLabel, String typeLabel,
                          LocalDate lastExecutionDate, LocalDate approvedOn, List<PlaceRef> places) {
    }

    /** {@code kind} is ZONE or PLACE. */
    public record PlaceRef(String kind, Long id, String label) {
    }

    public record AttendedSections(String rule, int covered, int total, BigDecimal percent) {
    }

    /** {@code percent} is null when the sector had no turn in the week (D-15). */
    public record Irrigation(String rule, long turns, int irrigatedSections, int totalSections, BigDecimal percent,
                             TopList<NotIrrigated> notIrrigated) {
    }

    public record NotIrrigated(Long sectionId, String code, String name, LocalDate lastIrrigatedOn) {
    }

    /** {@code unlocatedInScope} is null for a SUPERVISOR: their incidents are located by their team. */
    public record Incidents(LocalDate asOf, long open, long pendingApproval, Long unlocatedInScope,
                            TopList<IncidentRow> items) {
    }

    public record IncidentRow(Long id, String description, String locationReference, CodeLabel urgency,
                              CodeLabel status, String teamName, LocalDate reportedOn, long daysOpen,
                              String locatedBy) {
    }

    public record CodeLabel(String code, String label) {
    }
}
