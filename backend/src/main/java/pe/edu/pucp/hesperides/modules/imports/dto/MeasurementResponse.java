package pe.edu.pucp.hesperides.modules.imports.dto;

import java.time.LocalDate;

public record MeasurementResponse(
        Long id,
        LocalDate date,
        Double heightM,
        Double trunkHeightM,
        Double dbhCm,
        Double crownRadiusM,
        Boolean banded,
        String measuredBy,
        String notes,
        String origin,
        java.util.List<ExtraValue> extraValues
) {
    public record ExtraValue(String code, String label, String unitCode, java.math.BigDecimal value) {
    }
}
