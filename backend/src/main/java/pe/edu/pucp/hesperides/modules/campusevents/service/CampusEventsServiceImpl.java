package pe.edu.pucp.hesperides.modules.campusevents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.campusevents.EventRule;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventRequest;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventResponse;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Occurrence;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Warning;
import pe.edu.pucp.hesperides.modules.campusevents.entity.CampusEvent;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries.EventRow;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries.TypeRow;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventsRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.persistence.UserIds;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/** Orquesta el calendario del campus (SPEC-114): valida, guarda, audita y responde. */
@Service
@RequiredArgsConstructor
public class CampusEventsServiceImpl implements CampusEventsService {

    /** Dos meses: la agenda mensual con sus bordes (§3.1). */
    static final int MAX_RANGE_DAYS = 62;

    private final CampusEventsRepository events;
    private final CampusEventQueries queries;
    private final CampusEventCalendar calendar;
    private final CampusEventWarnings warnings;
    private final UserIds users;
    private final AuditService audit;

    @Override
    @Transactional(readOnly = true)
    public List<Occurrence> occurrences(LocalDate from, LocalDate to, String typeCode) {
        if (from == null || to == null || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) >= MAX_RANGE_DAYS) {
            throw new ValidationException("The range must go forward and last at most " + MAX_RANGE_DAYS + " days");
        }
        return calendar.between(from, to).stream()
                .filter(d -> typeCode == null || typeCode.equals(d.event().typeCode()))
                .map(CampusEventCalendar::occurrence).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CampusEventResponse get(long id) {
        return response(require(id));
    }

    @Override
    @Transactional
    public CampusEventResponse create(CampusEventRequest request, String email) {
        CampusEvent event = new CampusEvent();
        event.setCreatedByUserId(users.of(email));
        event.setVersion(0L);
        apply(event, request);
        events.saveAndFlush(event);
        audit.record(AuditActionCode.CAMPUS_EVENT_CREATED, "CampusEvent", event.getId(), Map.of("name", event.getName()));
        return response(event);
    }

    @Override
    @Transactional
    public CampusEventResponse update(long id, CampusEventRequest request, String email) {
        CampusEvent event = require(id);
        if (request == null || request.version() == null || !request.version().equals(event.getVersion())) {
            throw new ConflictException("The event was changed by someone else");
        }
        apply(event, request);
        event.setVersion(event.getVersion() + 1);
        events.saveAndFlush(event);
        audit.record(AuditActionCode.CAMPUS_EVENT_UPDATED, "CampusEvent", event.getId(), Map.of("name", event.getName()));
        return response(event);
    }

    @Override
    @Transactional
    public void delete(long id, String email) {
        CampusEvent event = require(id);
        event.softDelete();
        events.saveAndFlush(event);
        audit.record(AuditActionCode.CAMPUS_EVENT_DELETED, "CampusEvent", event.getId(), Map.of("name", event.getName()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Warning> check(List<LocalDate> dates, List<Long> zoneIds, List<Long> placeIds,
                               LocalTime startTime, LocalTime endTime) {
        return warnings.forWork(dates, zoneIds, placeIds, startTime, endTime);
    }

    private void apply(CampusEvent event, CampusEventRequest r) {
        EventRule rule = CampusEventRules.check(r, queries::zoneType);
        TypeRow type = queries.type(r.typeCode()).orElseThrow(() -> new ValidationException("Unknown event type"));
        event.setName(r.name().strip());
        event.setDescription(r.description() == null || r.description().isBlank() ? null : r.description().strip());
        event.setTypeItemId(type.id());
        event.setScope(r.scope());
        event.setZoneId(r.zoneId());
        event.setStartDate(rule.startDate());
        event.setEndDate(rule.endDate());
        event.setStartTime(rule.startTime());
        event.setEndTime(rule.endTime());
        event.setWeekdays(rule.weekdays().isEmpty() ? null
                : rule.weekdays().stream().sorted().map(d -> (short) d.getValue()).toArray(Short[]::new));
    }

    private CampusEvent require(long id) {
        return events.findActive(id).orElseThrow(() -> new ResourceNotFoundException("Campus event not found"));
    }

    private CampusEventResponse response(CampusEvent e) {
        EventRow row = queries.between(e.getStartDate(), e.getEndDate(), e.getId()).getFirst();
        List<Integer> days = e.getWeekdays() == null ? List.of()
                : java.util.Arrays.stream(e.getWeekdays()).map(Short::intValue).toList();
        return new CampusEventResponse(e.getId(), e.getName(), e.getDescription(), row.typeCode(), row.typeLabel(),
                e.getScope(), e.getZoneId(), row.zoneName(), e.getStartDate(), e.getEndDate(), e.getStartTime(),
                e.getEndTime(), days, e.getVersion());
    }
}
