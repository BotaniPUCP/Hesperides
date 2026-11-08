package pe.edu.pucp.hesperides.modules.irrigation.dto;

import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationPumpReading;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public record IrrigationPumpReadingResponse(
    Long id, LocalDate readingDate, Long recordedByUserId,
    BigDecimal initialMeterHours, BigDecimal finalMeterHours, BigDecimal reservoirLevelPercent,
    BigDecimal operationHours, BigDecimal flowM3PerHour, BigDecimal estimatedVolumeM3,
    BigDecimal dailyLimitHours, boolean exceedsDailyLimit
) {
    public static IrrigationPumpReadingResponse from(IrrigationPumpReading reading) {
        BigDecimal operationHours = reading.getFinalMeterHours().subtract(reading.getInitialMeterHours());
        BigDecimal volume = operationHours.multiply(reading.getFlowM3PerHour()).setScale(3, RoundingMode.HALF_UP);
        return new IrrigationPumpReadingResponse(reading.getId(), reading.getReadingDate(),
            reading.getRecordedByUserId(), reading.getInitialMeterHours(), reading.getFinalMeterHours(),
            reading.getReservoirLevelPercent(), operationHours, reading.getFlowM3PerHour(), volume,
            reading.getDailyLimitHours(), operationHours.compareTo(reading.getDailyLimitHours()) > 0);
    }
}
