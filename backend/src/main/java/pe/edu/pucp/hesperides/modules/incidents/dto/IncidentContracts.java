package pe.edu.pucp.hesperides.modules.incidents.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** HTTP contracts for SPEC-200. Nullable fields represent information not yet known. */
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
            @Positive Long teamId) {}

    public record CreateInterventionRequest(
            @NotNull UUID clientReference,
            @NotBlank @Size(max = 10000) String description,
            @Size(max = 50) String typeCode,
            boolean completed) {}

    public record OptionResponse(Long id, String code, String label) {}
    public record PersonResponse(Long id, String fullName) {}
    public record TeamResponse(Long id, String name) {}
    public record OptionsResponse(List<OptionResponse> statuses, List<OptionResponse> types,
            List<OptionResponse> urgencies, List<OptionResponse> activities, List<TeamResponse> teams) {}
    public record SummaryResponse(long pendingApproval, long pendingAttention, long inProgress,
            long resolved, long completedInterventions) {}
    public record IncidentResponse(Long id, String originalDescription, String description,
            String locationReference, Double latitude, Double longitude,
            OptionResponse type, OptionResponse urgency, OptionResponse status,
            PersonResponse reportedBy, TeamResponse team, PersonResponse approvedBy,
            Instant approvedAt, Instant resolvedAt, String channel, Instant createdAt, long version) {}
    public record InterventionResponse(Long id, String description, OptionResponse type,
            OptionResponse status, PersonResponse recordedBy, PersonResponse completedBy,
            Instant completedAt, Instant createdAt) {}
    public record HistoryResponse(Long id, OptionResponse status, PersonResponse changedBy, Instant createdAt) {}
    public record PhotoResponse(Long id, String contentType, long sizeBytes, Instant createdAt) {}
    public record PhotoContentResponse(String contentType, String base64) {}
    public record DetailResponse(IncidentResponse incident, List<InterventionResponse> interventions,
            List<HistoryResponse> history, List<PhotoResponse> photos, OptionResponse suggestedType,
            boolean canAttend) {}
}
