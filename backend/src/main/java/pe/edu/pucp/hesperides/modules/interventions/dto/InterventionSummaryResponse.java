package pe.edu.pucp.hesperides.modules.interventions.dto;

import lombok.Getter;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.ALWAYS)
public class InterventionSummaryResponse {
    private Long id;
    private String code;
    private Long version;
    private Long classItemId;
    private Long typeItemId;
    private String planningStatusCode;
    private String statusCode;
    private Long teamId;
    private Long assignedToUserId;
    private LocalDate scheduledDate;
    private Instant startedAt;
    private Instant completedAt;
    private Instant validatedAt;
    private int locationCount;
    private int completedLocationCount;
    private int validatedLocationCount;
    private int pendingEvidenceCount;

    /** An activity counts once, only after the coordinator approves every location.
     * This is not a measurement of campus maintenance coverage. */
    public boolean isApprovedForCounting() { return "VALIDATED".equals(statusCode); }
}

