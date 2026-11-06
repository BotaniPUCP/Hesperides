package pe.edu.pucp.hesperides.modules.incidents.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** HTTP contracts for SPEC-201. Nullable fields represent information not yet known. */
public final class IncidentContracts {
    private IncidentContracts() {}
    public record ListFilter(String severity,String urgency,String service,Long zoneId,String registration) {}

    public record CreateIncidentRequest(
            @NotBlank @Size(max = 10000) String description,
            @Size(max = 500) String locationReference,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @jakarta.validation.Valid MatrixRequest matrix) {
        public CreateIncidentRequest(String description,String locationReference,Double latitude,Double longitude) {
            this(description,locationReference,latitude,longitude,null);
        }
    }

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
            @Size(max = 1000) String impactedProcess, @Size(max = 10000) String observations,
            @Size(max = 50) String eventCode, @Size(max = 50) String intakeChannelCode,
            @Size(max = 200) String reporterName, @Positive Long zoneId) {
        public MatrixRequest(String serviceCode,String companyCode,String processCode,String subprocessCode,String severityCode,
                List<String> impactCodes,Long responsibleUserId,String immediateAction,String rootCauseCode,String rootCause,
                String preventiveAction,String impactedProcess,String observations) {
            this(serviceCode,companyCode,processCode,subprocessCode,severityCode,impactCodes,responsibleUserId,immediateAction,
                    rootCauseCode,rootCause,preventiveAction,impactedProcess,observations,"INCIDENT","FORM",null,null);
        }
    }

    public record CommentRequest(@NotNull UUID clientReference, @NotBlank @Size(max = 10000) String body) {}
    public record ReasonRequest(@NotNull @PositiveOrZero Long version, @NotBlank @Size(max = 2000) String reason) {}
    public record CorrectionRequest(@NotNull @PositiveOrZero Long version,
            @jakarta.validation.Valid @NotNull CreateIncidentRequest report) {}
    public record ResolutionRequest(@NotNull @PositiveOrZero Long version,
            @NotBlank @Size(max = 2000) String resolutionSummary) {}
    public record LinkInterventionRequest(@NotNull @PositiveOrZero Long version,
            @NotNull @Positive Long interventionId, @NotNull @PositiveOrZero Long interventionVersion,
            @NotBlank @Size(max = 50) String purposeCode) {}
    public record LinkedInterventionResponse(Long linkId, Long id, String code, String description,
            String statusCode, long version, OptionResponse purpose, int locationCount, int validatedLocationCount) {}

    public record OptionResponse(Long id, String code, String label) {}
    public record PersonResponse(Long id, String fullName) {}
    public record TeamResponse(Long id, String name) {}
    public record OptionsResponse(List<OptionResponse> statuses, List<OptionResponse> types,
            List<OptionResponse> urgencies, List<OptionResponse> activities, List<TeamResponse> teams,
            MatrixOptionsResponse matrix, List<OptionResponse> workStatuses,boolean canCreateIntervention) {}
    public record MatrixOptionResponse(Long id, String code, String label, String parentCode, String description) {}
    public record ZoneOptionResponse(Long id,String code,String label,String sectorLabel) {}
    public record MatrixOptionsResponse(List<MatrixOptionResponse> services, List<MatrixOptionResponse> companies,
            List<MatrixOptionResponse> processes, List<MatrixOptionResponse> subprocesses,
            List<MatrixOptionResponse> severities, List<MatrixOptionResponse> impacts,
            List<MatrixOptionResponse> rootCauses, List<MatrixOptionResponse> actionPurposes,
            List<PersonResponse> responsiblePeople,List<MatrixOptionResponse> events,List<MatrixOptionResponse> intakeChannels,
            List<ZoneOptionResponse> zones) {}
    public record MatrixResponse(OptionResponse event, OptionResponse serviceGroup, OptionResponse service,
            OptionResponse company, OptionResponse process, OptionResponse subprocess, OptionResponse severity,
            List<OptionResponse> impacts, PersonResponse responsible, String immediateAction,
            OptionResponse rootCauseItem, String rootCause, String preventiveAction,
            String impactedProcess, String observations,OptionResponse intakeChannel,String reporterName,ZoneOptionResponse zone) {}
    public record DistributionResponse(String label, long count) {}
    public record MatrixSummaryResponse(long pendingActions, long closedWithDuration, Double averageClosureBusinessDays,
            List<DistributionResponse> severities, List<DistributionResponse> impacts,
            List<DistributionResponse> services, List<DistributionResponse> responsiblePeople,
            List<DistributionResponse> states,List<DistributionResponse> urgencies,List<DistributionResponse> rootCauses,
            List<DistributionResponse> companies,List<DistributionResponse> sectors,List<DistributionResponse> locations,
            List<DistributionResponse> events,List<DistributionResponse> channels) {}
    public record DashboardResponse(long total,long active,long highUrgency,long pendingRegistration,long withoutWork,
            long readyForClosure,Instant generatedAt,List<IncidentResponse> attention) {}
    public record MyReportsResponse(long total,long pendingRegistration,long active,long resolved,List<IncidentResponse> recent) {}
    public record SummaryResponse(long pendingApproval, long pendingAttention, long inProgress,
            long resolved, long completedInterventions, MatrixSummaryResponse matrix,
            long pendingCorrection, long resolutionObserved, long validatedInterventions,DashboardResponse dashboard) {}
    public record IncidentResponse(Long id, String originalDescription, String description,
            String locationReference, Double latitude, Double longitude,
            OptionResponse type, OptionResponse urgency, OptionResponse status,
            PersonResponse reportedBy, TeamResponse team, PersonResponse approvedBy,
            Instant approvedAt, Instant resolvedAt, String channel, Instant createdAt, long version,
            String officialCode, MatrixResponse matrix, Long closureBusinessDays,
            String correctionReason, String resolutionSummary, PersonResponse resolvedBy, String resolutionObservation) {}
    public record UpdateResponse(Long id, PersonResponse author, OptionResponse kind, String body, Instant createdAt) {}
    public record ExportResponse(String filename, String contentType, String content) {}
    public record HistoryResponse(Long id, OptionResponse status, PersonResponse changedBy, Instant createdAt) {}
    public record PhotoResponse(Long id, String contentType, long sizeBytes, Instant createdAt) {}
    public record PhotoContentResponse(String contentType, String base64) {}
    public record DetailResponse(IncidentResponse incident,
            List<HistoryResponse> history, List<PhotoResponse> photos, OptionResponse suggestedType,
            boolean canAttend, List<UpdateResponse> updates,
            List<LinkedInterventionResponse> linkedInterventions, long requiredInterventionCount,
            boolean canResolve, boolean canCorrectReport,boolean canEdit,boolean canLinkInterventions,boolean canCreateIntervention) {}
}
