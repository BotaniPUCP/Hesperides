package pe.edu.pucp.hesperides.modules.incidents.dto;

import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Contratos HTTP de SPEC-201 (rediseño). Un campo nulo es información que aún no se conoce. */
public final class IncidentContracts {
    private IncidentContracts() {}

    public static final int MAX_TEXT = 10000;
    public static final int MAX_SUMMARY = 2000;

    // ── Peticiones ──────────────────────────────────────────────────────────────────────
    /** Solo descripción y gravedad son obligatorias (§3.2). «Pedido de» viene prellenado. */
    public record CreateIncidentRequest(
            @NotBlank @Size(max = MAX_TEXT) String description,
            @NotBlank @Size(max = 50) String reportedUrgencyCode,
            @Size(max = 500) String locationReference,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @Positive Long zoneId,
            @Positive Long requestedByOrganizationId,
            @Size(max = 200) String requestedByName,
            @Positive Long requesterContactId,
            @Positive Long requestedForOrganizationId,
            @Size(max = 50) String sourceCode,
            @Size(max = 40) String externalCode) {}

    /** Coordinación puede modificar todo (§3.6); lo original queda aparte. */
    public record ReviewIncidentRequest(
            @NotNull @PositiveOrZero Long version,
            @Size(max = 120) String title,
            @NotBlank @Size(max = MAX_TEXT) String description,
            @Size(max = 50) String urgencyCode,
            @Size(max = 50) String typeCode,
            @Positive Long zoneId,
            @Size(max = 500) String locationReference,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @Positive Long teamId,
            boolean thirdParty,
            @Positive Long providerOrganizationId,
            @Min(1) @Max(90) Integer agreedDays,
            @Size(max = 20) String heightClass,
            @Positive Long requestedByOrganizationId,
            @Size(max = 200) String requestedByName,
            @Positive Long requesterContactId,
            @Positive Long requestedForOrganizationId,
            @Size(max = 50) String sourceCode,
            @Size(max = 40) String externalCode) {}

    public record VersionRequest(@NotNull @PositiveOrZero Long version) {}
    public record LinkRequest(@NotNull @PositiveOrZero Long version, @NotNull @Positive Long interventionId) {}
    public record ReasonRequest(@NotNull @PositiveOrZero Long version, @NotBlank @Size(max = MAX_SUMMARY) String reason) {}
    public record ReplaceRequest(@NotNull @PositiveOrZero Long version, @NotNull @Positive Long interventionId,
                                 @NotBlank @Size(max = MAX_SUMMARY) String reason) {}
    public record CloseRequest(@NotNull @PositiveOrZero Long version,
                               @NotBlank @Size(max = MAX_SUMMARY) String resolutionSummary) {}
    public record CommentRequest(@NotNull UUID clientReference, @NotBlank @Size(max = MAX_TEXT) String body) {}

    // ── Respuestas ──────────────────────────────────────────────────────────────────────
    public record OptionResponse(Long id, String code, String label) {}
    public record TypeOptionResponse(Long id, String code, String label, String classCode) {}
    public record PersonResponse(Long id, String fullName) {}
    public record TeamResponse(Long id, String name) {}
    public record ZoneResponse(Long id, String code, String name) {}
    public record OrganizationResponse(Long id, String name) {}
    public record RequesterResponse(Long organizationId, String organizationName, String name,
                                    Long contactId, String contactName) {}
    public record DeadlineResponse(Instant dueAt, String status, Boolean met) {}

    public record IncidentResponse(
            Long id, String code, String title, String originalDescription, String description,
            OptionResponse reportedUrgency, OptionResponse urgency, OptionResponse type, OptionResponse status,
            boolean active, ZoneResponse zone, String locationReference, Double latitude, Double longitude,
            TeamResponse team, boolean thirdParty, OrganizationResponse provider, Integer agreedDays,
            String heightClass, RequesterResponse requestedBy, OrganizationResponse requestedFor,
            OptionResponse source, String externalCode, PersonResponse reportedBy,
            PersonResponse activatedBy, Instant activatedAt, PersonResponse closedBy, Instant closedAt,
            String resolutionSummary, DeadlineResponse deadline, Instant createdAt, long version,
            List<String> editedFields) {}

    public record PrefillResponse(String status, Map<String, Object> suggestion, String suggestedUrgencyCode,
                                  boolean suggestsThirdParty, List<String> warnings, Instant updatedAt) {}
    public record LinkedInterventionResponse(Long linkId, Long id, String code, String description,
                                             String statusCode, int locationCount, int validatedLocationCount) {}
    public record SimilarCaseResponse(Long id, String code, String title, String resolutionSummary) {}
    public record HistoryResponse(Long id, OptionResponse status, PersonResponse changedBy, Instant createdAt) {}
    public record UpdateResponse(Long id, PersonResponse author, OptionResponse kind, String body, Instant createdAt) {}
    public record PhotoResponse(Long id, String contentType, long sizeBytes, Instant createdAt) {}
    public record PhotoContentResponse(String contentType, String base64) {}
    public record CapabilitiesResponse(boolean canEdit, boolean canActivate, boolean canLink, boolean canClose,
                                       boolean canRetryPrefill, boolean canComment, boolean canAddPhoto) {}

    public record DetailResponse(
            IncidentResponse incident, PrefillResponse prefill,
            List<LinkedInterventionResponse> linkedInterventions, List<String> closureBlockers,
            List<String> activationGaps, List<SimilarCaseResponse> similarCases,
            List<HistoryResponse> history, List<PhotoResponse> photos, List<UpdateResponse> updates,
            CapabilitiesResponse capabilities) {}

    public record CreationResult(DetailResponse detail, boolean created) {}
    public record MineResponse(long total, long notActive, long open, long closed, List<IncidentResponse> recent) {}
    public record OptionsResponse(List<OptionResponse> urgencies, List<OptionResponse> classes,
                                  List<TypeOptionResponse> types, List<OptionResponse> statuses,
                                  List<OptionResponse> sources, List<String> heightClasses,
                                  List<TeamResponse> teams, String defaultRequesterName) {}
    /** Lo mínimo para buscar una incidencia desde Intervenciones y mostrarla en su detalle. */
    public record IncidentRefResponse(Long id, String code, String title, String statusCode, boolean active) {}
    public record MapMarkerResponse(Long id, String code, String title, double latitude, double longitude,
                                    String urgencyCode, String deadlineStatus) {}
    public record MapResponse(List<MapMarkerResponse> markers, long withoutLocation) {}
}
