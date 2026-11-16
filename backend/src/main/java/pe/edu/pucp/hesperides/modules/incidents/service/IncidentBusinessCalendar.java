package pe.edu.pucp.hesperides.modules.incidents.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.campusevents.CampusHolidays;

import java.time.*;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Inclusive NETWORKDAYS semantics with an explicit institutional calendar. Non-business days
 * are weekends, the {@code hesperides.incidents.holidays} list and the holidays registered in
 * the campus calendar (SPEC-114 D-07): the list is kept so deployments that set it lose nothing.
 */
@Component
public class IncidentBusinessCalendar {
    private final ZoneId zone;
    private final Set<LocalDate> holidays;
    private final CampusHolidays registered;

    public IncidentBusinessCalendar(String zone, String holidays) {
        this(zone, holidays, CampusHolidays.NONE);
    }

    @Autowired
    public IncidentBusinessCalendar(@Value("${hesperides.incidents.time-zone}") String zone,
            @Value("${hesperides.incidents.holidays:}") String holidays, CampusHolidays registered) {
        this.zone = ZoneId.of(zone);
        this.holidays = Arrays.stream(holidays.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .map(LocalDate::parse).collect(Collectors.toUnmodifiableSet());
        this.registered = registered;
    }

    public LocalDate date(Instant instant) { return instant.atZone(zone).toLocalDate(); }

    public long count(Instant receivedAt, Instant closedAt) {
        LocalDate start = date(receivedAt), end = date(closedAt);
        if (end.isBefore(start)) throw new IllegalArgumentException("Closure precedes reception");
        Set<LocalDate> fromCalendar = registered.between(start, end);
        return start.datesUntil(end.plusDays(1)).filter(d -> d.getDayOfWeek() != DayOfWeek.SATURDAY
                && d.getDayOfWeek() != DayOfWeek.SUNDAY && !holidays.contains(d) && !fromCalendar.contains(d)).count();
    }
}
