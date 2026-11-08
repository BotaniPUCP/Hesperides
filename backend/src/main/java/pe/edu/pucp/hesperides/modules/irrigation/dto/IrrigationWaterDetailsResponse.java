package pe.edu.pucp.hesperides.modules.irrigation.dto;

import java.math.BigDecimal;

public record IrrigationWaterDetailsResponse(
    String sourceLabel,
    String methodLabel,
    Integer tankerTrips,
    BigDecimal tankerVolumeM3
) {}
