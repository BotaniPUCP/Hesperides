package pe.edu.pucp.hesperides.modules.irrigation.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationCoverageResponse;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;

import static pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes.IRRIGATION_COVERAGE_MAX_DAYS;

@Service
public class IrrigationCoverageService {
    private final IrrigationZoneQueries zones;
    private final SystemParameterReader parameters;
    private final Clock clock;

    public IrrigationCoverageService(IrrigationZoneQueries zones, SystemParameterReader parameters, Clock clock,
            @Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this.zones = zones;
        this.parameters = parameters;
        this.clock = clock.withZone(ZoneId.of(timeZone));
    }

    @Transactional(readOnly = true)
    public IrrigationCoverageResponse currentMonth() {
        LocalDate asOf = LocalDate.now(clock);
        LocalDate monthStart = asOf.withDayOfMonth(1);
        Integer maxDays = parameters.readInt(IRRIGATION_COVERAGE_MAX_DAYS).filter(days -> days > 0).orElse(null);
        var sections = new ArrayList<IrrigationCoverageResponse.Section>();
        BigDecimal measuredArea = BigDecimal.ZERO;
        BigDecimal irrigatedArea = BigDecimal.ZERO;
        for (var section : zones.activeGreenSectionsWithLastIrrigation(asOf)) {
            LocalDate lastDate = section.lastIrrigatedOn();
            boolean irrigatedThisMonth = lastDate != null && !lastDate.isBefore(monthStart);
            Long days = lastDate == null ? null : ChronoUnit.DAYS.between(lastDate, asOf);
            BigDecimal area = section.areaM2();
            if (area != null && area.signum() > 0) {
                measuredArea = measuredArea.add(area);
                if (irrigatedThisMonth) {
                    irrigatedArea = irrigatedArea.add(area);
                }
            }
            sections.add(new IrrigationCoverageResponse.Section(section.id(), section.code(), section.name(),
                section.sectorName(), area, lastDate, days, irrigatedThisMonth));
        }
        BigDecimal percent = irrigatedArea.signum() == 0 ? null
            : irrigatedArea.movePointRight(2).divide(measuredArea, 2, RoundingMode.HALF_UP);
        return new IrrigationCoverageResponse(monthStart, asOf, measuredArea, irrigatedArea, percent, maxDays,
            sections);
    }
}
