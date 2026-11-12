package pe.edu.pucp.hesperides.modules.incidents.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** HTTP contracts for SPEC-201. Nullable fields represent information not yet known. */
public final class IncidentContracts {
    private IncidentContracts() {}

    public record CreateIncidentRequest(
            @NotBlank @Size(max = 10000) String description,
            @Size(max = 500) String locationReference,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude) {}

    public record ReviewIncidentRequest(
            @NotNull @PositiveOrZero Long version,
            @NotBlank @Size(max = 10000) String description,
            @Size(max = 500) String locationReference,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @Size(max = 50) String typeCode, @Size(max = 50) String urgencyCode,
            @Positive Long teamId, @jakarta.validation.Valid MatrixRequest matrix) {
        public ReviewIncidentRequest(Long version, String description, String locationReference,
                Double latitude, Double longitude, String typeCode, String urgencyCode, Long teamId) {
            this(version, description, locationReference, latitude, longitude, typeCode, urgencyCode, teamId, null);
        }
    }

    public record MatrixRequest(
            @Size(max = 50) String serviceCode, @Size(max = 50) String companyCode,
            @Size(max = 50) String processCode, @Size(max = 50) String subprocessCode,
            @Size(max = 50) String severityCode,
            @Size(max = 50) List<@NotBlank @Size(max = 50) String> impactCodes,
            @Positive Long responsibleUserId,
            @Size(max = 10000) String immediateAction, @Size(max = 50) String rootCauseCode,
            @Size(max = 10000) String rootCause, @Size(max = 10000) String preventiveAction,
            @Size(max = 1000) String impactedProcess, @Size(max = 10000) String observations) {}

    public record CommentRequest(@NotNull UUID clientReference, @NotBlank @Size(max = 10000) String body) {}
    public record ReasonRequest(@NotNull @PositiveOrZero Long version, @NotBlank @Size(max = 2000) String reason) {}
    public record CorrectionRequest(@NotNull @PositiveOrZero Long version,
            @jakarta.validation.Valid @NotNull CreateIncidentRequest report) {}
    public record ResolutionRequest(@NotNull @PositiveOrZero Long version,
            @NotBlank @Size(max = 2000) String resolutionSummary) {}
    public record LinkInterventionRequest(@NotNull @PositiveOrZero Long version,
            @NotNull @Positive Long interventionId, @NotNull @PositiveOrZero Long interventionVersion,
            @NotBlank @Size(max = 50) String purposeCode,
            @Size(max = 100) List<@NotNull @Positive Long> legacyWorkIds) {}
    public record LinkedInterventionResponse(Long linkId, Long id, String code, String description,
            String statusCode, long version, OptionResponse purpose, int locationCount, int validatedLocationCount) {}

    public record CreateInterventionRequest(
            @NotNull UUID clientReference,
            @NotBlank @Size(max = 10000) String description,
            @Size(max = 50) String typeCode,
            boolean completed, @Size(max = 50) String purposeCode) {
        public CreateInterventionRequest(UUID clientReference, String description, String typeCode, boolean completed) {
            this(clientReference, description, typeCode, completed, null);
        }
    }

    public record OptionResponse(Long id, String code, String label) {}
    public record PersonResponse(Long id, String fullName) {}
    public record TeamResponse(Long id, String name) {}
    public record OptionsResponse(List<OptionResponse> statuses, List<OptionResponse> types,
            List<OptionResponse> urgencies, List<OptionResponse> activities, List<TeamResponse> teams,
            MatrixOptionsResponse matrix, List<OptionResponse> workStatuses) {}
    public record MatrixOptionResponse(Long id, String code, String label, String parentCode, String description) {}
    public record MatrixOptionsResponse(List<MatrixOptionResponse> services, List<MatrixOptionResponse> companies,
            List<MatrixOptionResponse> processes, List<MatrixOptionResponse> subprocesses,
            List<MatrixOptionResponse> severities, List<MatrixOptionResponse> impacts,
            List<MatrixOptionResponse> rootCauses, List<MatrixOptionResponse> actionPurposes,
            List<PersonResponse> responsiblePeople) {}
    public record MatrixResponse(OptionResponse event, OptionResponse serviceGroup, OptionResponse service,
            OptionResponse company, OptionResponse process, OptionResponse subprocess, OptionResponse severity,
            List<OptionResponse> impacts, PersonResponse responsible, String immediateAction,
            OptionResponse rootCauseItem, String rootCause, String preventiveAction,
            String impactedProcess, String observations) {}
    public record DistributionResponse(String label, long count) {}
    public record MatrixSummaryResponse(long pendingActions, long closedWithDuration, Double averageClosureBusinessDays,
            List<DistributionResponse> severities, List<DistributionResponse> impacts,
            List<DistributionResponse> services, List<DistributionResponse> responsiblePeople) {}
    public record SummaryResponse(long pendingApproval, long pendingAttention, long inProgress,
            long resolved, long completedInterventions, MatrixSummaryResponse matrix,
            long pendingCorrection, long resolutionObserved, long validatedInterventions) {}
    public record IncidentResponse(Long id, String originalDescription, String description,
            String locationReference, Double latitude, Double longitude,
            OptionResponse type, OptionResponse urgency, OptionResponse status,
            PersonResponse reportedBy, TeamResponse team, PersonResponse approvedBy,
            Instant approvedAt, Instant resolvedAt, String channel, Instant createdAt, long version,
            String officialCode, MatrixResponse matrix, Long closureBusinessDays,
            String correctionReason, String resolutionSummary, PersonResponse resolvedBy, String resolutionObservation) {}
    public record InterventionResponse(Long id, String description, OptionResponse type,
            OptionResponse status, PersonResponse recordedBy, PersonResponse completedBy,
            Instant completedAt, Instant createdAt, OptionResponse purpose, Long replacementInterventionId) {}
    public record UpdateResponse(Long id, PersonResponse author, OptionResponse kind, String body, Instant createdAt) {}
    public record ExportResponse(String filename, String contentType, String content) {}
    public record HistoryResponse(Long id, OptionResponse status, PersonResponse changedBy, Instant createdAt) {}
    public record PhotoResponse(Long id, String contentType, long sizeBytes, Instant createdAt) {}
    public record PhotoContentResponse(String contentType, String base64) {}
    public record DetailResponse(IncidentResponse incident, List<InterventionResponse> interventions,
            List<HistoryResponse> history, List<PhotoResponse> photos, OptionResponse suggestedType,
            boolean canAttend, List<UpdateResponse> updates,
            List<LinkedInterventionResponse> linkedInterventions, long requiredInterventionCount,
            boolean canResolve, boolean canCorrectReport) {}
}
