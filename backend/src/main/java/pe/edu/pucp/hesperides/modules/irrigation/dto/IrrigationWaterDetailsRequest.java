package pe.edu.pucp.hesperides.modules.irrigation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record IrrigationWaterDetailsRequest(
    @NotBlank @Size(max = 50) String sourceCode,
    @NotBlank @Size(max = 50) String methodCode,
    BigDecimal tankerTrips,
    BigDecimal tankerVolumeM3
) {}
