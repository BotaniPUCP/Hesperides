package pe.edu.pucp.hesperides.modules.interventions.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class InterventionRequests {
    private InterventionRequests() {}
    public record Point(@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
                        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
    public record Location(Long id, @NotNull UUID clientReference, Long zoneId, Long placeId,
            @Valid Point location, List<@NotNull Long> elementIds, @Size(max=4000) String description,
            Long unitItemId, @DecimalMin("0") @Digits(integer=9, fraction=3) BigDecimal requestedQuantity,
            List<@NotBlank @Size(max=100) String> elementCodes) {
        public Location { elementIds = elementIds == null ? List.of() : java.util.Collections.unmodifiableList(new java.util.ArrayList<>(elementIds)); }
    }
    public record Planning(@NotNull Long classItemId, Long typeItemId, @NotNull LocalDate scheduledDate,
            @Size(max=4000) String description, Long originItemId, Long reportedByItemId,
            @Size(max=40) String externalCode, LocalDate requestedAt,
            @NotEmpty List<@NotNull @Valid Location> locations,
            @PositiveOrZero Long version, @Size(max=2000) String rescheduleReason) {}
    public record Assignment(@NotNull @PositiveOrZero Long version, @NotNull Long teamId,
                             @NotNull Long assignedToUserId) {}
    public record Cancellation(@NotNull @PositiveOrZero Long version,
                               @NotBlank @Size(max=2000) String reason) {}
    public record Start(@NotNull @PositiveOrZero Long version) {}
    public record Completion(@NotNull @PositiveOrZero Long version,
            @DecimalMin("0") @Digits(integer=9, fraction=3) BigDecimal executedQuantity,
            @NotBlank @Size(max=4000) String executionNotes) {}
    public record Review(@NotNull @PositiveOrZero Long version) {}
    public record Observation(@NotNull @PositiveOrZero Long version,
            @NotBlank @Size(max=2000) String reason) {}
    public record Execution(@NotNull @PositiveOrZero Long version,
            @DecimalMin("0") @Digits(integer=9, fraction=3) BigDecimal progressQuantity,
            @Size(max=4000) String executionNotes) {}
    public record Evidence(@NotNull @PositiveOrZero Long version, @NotNull Long interventionLocationId,
            @NotNull UUID clientReference, @NotBlank @Size(max=50) String momentCode,
            Long greenElementId, java.time.Instant capturedAt, @Valid Point capturedLocation,
            @Size(max=255) String caption) {}
    public record Filter(String statusCode, String locationStatusCode, Long classItemId, Long typeItemId,
            Long zoneId, Long placeId, Long greenElementId, Long teamId, Long assignedToUserId,
            @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateTo, Long incidentId,
            @Size(min=1,max=100) String greenElementCode) {}
}

