package pe.edu.pucp.hesperides.modules.irrigation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationPumpReadingRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationPumpReadingResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationPumpReadingsResponse;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationPumpReading;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationPumpReadingsRepository;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.security.RoleCodes;

import java.math.BigDecimal;
import java.sql.SQLException;

import static pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes.IRRIGATION_PUMP_DAILY_LIMIT_HOURS;
import static pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes.IRRIGATION_PUMP_FLOW_M3_PER_HOUR;

@Service
@RequiredArgsConstructor
public class IrrigationPumpReadingsService {
    private static final BigDecimal HOURS_PER_DAY = BigDecimal.valueOf(24);
    private static final String DUPLICATE_READING = "Ya existe una lectura de bombeo para esa fecha";

    private final IrrigationPumpReadingsRepository readings;
    private final SystemParameterReader parameters;
    private final UsersRepository users;

    @Transactional(readOnly = true)
    public IrrigationPumpReadingsResponse findRecent() {
        return new IrrigationPumpReadingsResponse(
            parameters.readDecimal(IRRIGATION_PUMP_FLOW_M3_PER_HOUR).orElse(null),
            parameters.readDecimal(IRRIGATION_PUMP_DAILY_LIMIT_HOURS).orElse(null),
            readings.findTop30ByDeletedAtIsNullOrderByReadingDateDesc().stream()
                .map(IrrigationPumpReadingResponse::from).toList());
    }

    @Transactional
    public IrrigationPumpReadingResponse create(CreateIrrigationPumpReadingRequest request, String email) {
        User supervisor = users.findActiveByEmail(email).filter(User::isActive)
            .filter(user -> RoleCodes.SUPERVISOR.equals(user.getRoleCode()))
            .orElseThrow(() -> new AccessDeniedException("Solo el supervisor registra lecturas de bombeo"));
        BigDecimal hours = request.finalMeterHours().subtract(request.initialMeterHours());
        if (hours.signum() < 0 || hours.compareTo(HOURS_PER_DAY) > 0) {
            throw new ValidationException("La diferencia de horómetro debe estar entre 0 y 24 horas");
        }
        if (readings.existsByReadingDateAndDeletedAtIsNull(request.readingDate())) {
            throw new ConflictException(DUPLICATE_READING);
        }
        BigDecimal flow = parameters.readDecimal(IRRIGATION_PUMP_FLOW_M3_PER_HOUR)
            .orElseThrow(() -> new ValidationException("Configura el caudal de la bomba en Administración"));
        BigDecimal limit = parameters.readDecimal(IRRIGATION_PUMP_DAILY_LIMIT_HOURS)
            .orElseThrow(() -> new ValidationException("Configura el límite diario de bombeo en Administración"));

        IrrigationPumpReading reading = new IrrigationPumpReading();
        reading.setReadingDate(request.readingDate());
        reading.setRecordedByUserId(supervisor.getId());
        reading.setInitialMeterHours(request.initialMeterHours());
        reading.setFinalMeterHours(request.finalMeterHours());
        reading.setReservoirLevelPercent(request.reservoirLevelPercent());
        reading.setFlowM3PerHour(flow);
        reading.setDailyLimitHours(limit);
        try {
            return IrrigationPumpReadingResponse.from(readings.saveAndFlush(reading));
        } catch (DataIntegrityViolationException ex) {
            if (ex.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
                throw new ConflictException(DUPLICATE_READING);
            }
            throw ex;
        }
    }
}
