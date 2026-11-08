package pe.edu.pucp.hesperides.modules.irrigation.dto;

import java.math.BigDecimal;
import java.util.List;

public record IrrigationPumpReadingsResponse(
    BigDecimal flowM3PerHour,
    BigDecimal dailyLimitHours,
    List<IrrigationPumpReadingResponse> readings
) {}
