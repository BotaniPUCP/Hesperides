package pe.edu.pucp.hesperides.modules.campusevents.service;

import pe.edu.pucp.hesperides.engine.campusevents.EventOccurrences;
import pe.edu.pucp.hesperides.engine.campusevents.EventRule;
import pe.edu.pucp.hesperides.engine.campusevents.EventScope;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventRequest;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.time.DayOfWeek;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.LongFunction;

/**
 * Las reglas de un evento (SPEC-114 §3.1): forma → 400, negocio → 422. Los mensajes van en
 * inglés y el frontend los traduce, como en el resto del backend.
 */
final class CampusEventRules {

    /** D-09: más de un año entre inicio y fin es casi siempre un año mal tecleado. */
    static final int MAX_DAYS = 366;
    static final int NAME_MAX = 150;
    static final int DESCRIPTION_MAX = 500;
    static final String HOLIDAY = "HOLIDAY";

    private CampusEventRules() {
    }

    /** Valida la petición y devuelve su regla; {@code zoneType} da el tipo de una zona activa. */
    static EventRule check(CampusEventRequest r, LongFunction<Optional<String>> zoneType) {
        requireForm(r);
        EventScope scope = scope(r.scope());
        if (r.endDate().isBefore(r.startDate())) {
            throw new BusinessRuleException("The end date is before the start date");
        }
        if (r.endDate().isAfter(r.startDate().plusDays(MAX_DAYS - 1L))) {
            throw new BusinessRuleException("An event lasts at most " + MAX_DAYS + " days");
        }
        if ((r.startTime() == null) != (r.endTime() == null)) {
            throw new BusinessRuleException("Both start and end time are required, or neither");
        }
        if (r.startTime() != null && !r.endTime().isAfter(r.startTime())) {
            throw new BusinessRuleException("The end time must be after the start time");
        }
        if (HOLIDAY.equals(r.typeCode()) && scope != EventScope.CAMPUS) {
            throw new BusinessRuleException("A holiday applies to the whole campus");
        }
        requireZone(scope, r.zoneId(), zoneType);
        EventRule rule = new EventRule(r.startDate(), r.endDate(), weekdays(r.weekdays()), r.startTime(), r.endTime());
        if (!EventOccurrences.hasAny(rule)) {
            throw new BusinessRuleException("With those weekdays the event does not happen on any of its dates");
        }
        return rule;
    }

    private static void requireForm(CampusEventRequest r) {
        if (r == null || r.name() == null || r.name().isBlank()) {
            throw new ValidationException("The name is required");
        }
        if (r.name().strip().length() > NAME_MAX) {
            throw new ValidationException("The name is too long");
        }
        if (r.description() != null && r.description().strip().length() > DESCRIPTION_MAX) {
            throw new ValidationException("The description is too long");
        }
        if (r.startDate() == null || r.endDate() == null) {
            throw new ValidationException("Start and end dates are required");
        }
    }

    static EventScope scope(String value) {
        try {
            return EventScope.valueOf(value);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ValidationException("Unknown event scope");
        }
    }

    private static void requireZone(EventScope scope, Long zoneId, LongFunction<Optional<String>> zoneType) {
        if (scope == EventScope.CAMPUS) {
            if (zoneId != null) {
                throw new BusinessRuleException("A campus-wide event has no zone");
            }
            return;
        }
        String type = zoneId == null ? null : zoneType.apply(zoneId).orElse(null);
        boolean fits = scope == EventScope.SECTOR ? "SECTOR".equals(type)
                : "SECTION".equals(type) || "SUBSECTION".equals(type);
        if (!fits) {
            throw new BusinessRuleException("The zone does not match the event scope");
        }
    }

    private static Set<DayOfWeek> weekdays(List<Integer> days) {
        Set<DayOfWeek> set = new HashSet<>();
        if (days != null) {
            for (Integer d : days) {
                if (d == null || d < 1 || d > 7) {
                    throw new ValidationException("Weekdays go from 1 (Monday) to 7 (Sunday)");
                }
                set.add(DayOfWeek.of(d));
            }
        }
        return set;
    }
}
