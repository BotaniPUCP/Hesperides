package pe.edu.pucp.hesperides.modules.irrigation.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record IrrigationTurnResponse(
    Long id,
    Long sectorZoneId,
    String sectorName,
    Long supervisorUserId,
    LocalDate irrigationDate,
    LocalTime startedAt,
    LocalTime finishedAt,
    List<IrrigationZoneResponse> sections,
    String notes
) {}
