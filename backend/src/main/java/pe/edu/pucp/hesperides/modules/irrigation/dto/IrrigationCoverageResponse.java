package pe.edu.pucp.hesperides.modules.irrigation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record IrrigationCoverageResponse(
    LocalDate monthStart,
    LocalDate asOf,
    BigDecimal measuredAreaM2,
    BigDecimal irrigatedAreaM2,
    BigDecimal coveragePercent,
    Integer maxDaysWithoutIrrigation,
    List<Section> sections
) {
    public record Section(Long id, String code, String name, String sectorName, BigDecimal areaM2,
                          LocalDate lastIrrigatedOn, Long daysWithoutIrrigation, boolean irrigatedThisMonth) {}
}
