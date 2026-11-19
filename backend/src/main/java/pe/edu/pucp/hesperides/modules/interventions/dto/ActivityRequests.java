package pe.edu.pucp.hesperides.modules.interventions.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** The activity contract is explicit; legacy location commands cannot express a global snapshot. */
public final class ActivityRequests {
    private ActivityRequests() {}
    public record Planning(@NotNull @Valid InterventionRequests.Planning planning,
                           @Positive Long responsibleSupervisorUserId) {}
    public record Target(@NotNull @Positive Long locationId,
                         @NotBlank @Pattern(regexp="NOT_STARTED|PARTIAL|COMPLETED") String statusCode,
                         @Size(max=4000) String partialDescription) {}
    public record Progress(@NotNull @PositiveOrZero Long version, @NotNull UUID clientReference,
                           @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer=3,fraction=2) BigDecimal percentage,
                           @NotBlank @Size(max=4000) String description,
                           @NotEmpty @Size(max=6000) List<@NotNull @Valid Target> targets,
                           @Size(max=6000) List<@NotNull @Positive Long> evidenceIds) {}
    public record Version(@NotNull @PositiveOrZero Long version) {}
    public record Responsible(@NotNull @PositiveOrZero Long version,@Positive Long responsibleSupervisorUserId) {}
    public record Cancel(@NotNull @PositiveOrZero Long version,@Size(max=2000) String reason) {}
    public record Evidence(@NotNull @PositiveOrZero Long version,@NotNull UUID clientReference,
                           @Positive Long locationId,@NotBlank @Size(max=50) String momentCode,
                           @Size(max=255) String caption) {}
}
