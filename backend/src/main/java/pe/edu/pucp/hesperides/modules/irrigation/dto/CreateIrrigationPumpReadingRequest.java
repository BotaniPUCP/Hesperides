package pe.edu.pucp.hesperides.modules.irrigation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateIrrigationPumpReadingRequest(
    @NotNull LocalDate readingDate,
    @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal initialMeterHours,
    @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal finalMeterHours,
    @NotNull @PositiveOrZero @DecimalMax("100") @Digits(integer = 3, fraction = 3) BigDecimal reservoirLevelPercent
) {}
