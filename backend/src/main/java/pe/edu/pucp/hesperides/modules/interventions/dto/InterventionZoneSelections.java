package pe.edu.pucp.hesperides.modules.interventions.dto;

import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import tools.jackson.databind.JsonNode;

public final class InterventionZoneSelections {
    private InterventionZoneSelections() { }
    public record Place(long id, String code, String name, boolean geometryValid, JsonNode geometry) { }
    public record Zone(long id, String code, String name, boolean geometryValid, JsonNode geometry,
                       BigDecimal areaM2, InterventionRequests.Point point, int polygonCount) { }
    public record Options(Place place, String datasetRevision, long reviewVersion, boolean reviewed,
                          boolean current, String selectionRevision, List<Zone> zones, List<Zone> candidates,
                          Instant reviewedAt, Long reviewedByUserId) { }
    public record Review(@NotBlank @Pattern(regexp="[0-9a-f]{64}") String datasetRevision,
                         @NotNull @PositiveOrZero Long version,
                         @NotNull @Size(max=1000) List<@NotNull @Positive Long> zoneIds,
                         @Size(max=1000) List<@NotNull @Positive Long> multipartAcknowledged,
                         @NotBlank @Size(max=2000) String reason) { }
    public record Selection(@NotNull @Positive Long placeId, @NotNull @Positive Long zoneId,
                            @NotBlank @Pattern(regexp="[0-9a-f]{64}") String zoneSelectionRevision) { }
    public record Preview(@NotEmpty @Size(max=1000) List<@NotNull @Valid Selection> selections) { }
    public record PreviewResponse(BigDecimal surfaceM2,List<Zone> zones) { }
}
