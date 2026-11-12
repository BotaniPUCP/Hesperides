package pe.edu.pucp.hesperides.modules.irrigation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CreateIrrigationTurnRequest(
    @NotNull Long sectorZoneId,
    @NotNull LocalDate irrigationDate,
    LocalTime startedAt,
    LocalTime finishedAt,
    @NotEmpty List<@NotNull Long> sectionZoneIds,
    @Size(max = 500) String notes
) {}
