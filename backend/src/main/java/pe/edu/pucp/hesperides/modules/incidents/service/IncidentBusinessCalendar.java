package pe.edu.pucp.hesperides.modules.incidents.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/** Inclusive NETWORKDAYS semantics with an explicit institutional calendar. */
@Component
public class IncidentBusinessCalendar {
    private final ZoneId zone;
    private final Set<LocalDate> holidays;

    public IncidentBusinessCalendar(@Value("${hesperides.incidents.time-zone}") String zone,
            @Value("${hesperides.incidents.holidays:}") String holidays) {
        this.zone = ZoneId.of(zone);
        this.holidays = Arrays.stream(holidays.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .map(LocalDate::parse).collect(Collectors.toUnmodifiableSet());
    }

    public LocalDate date(Instant instant) { return instant.atZone(zone).toLocalDate(); }

    public long count(Instant receivedAt, Instant closedAt) {
        LocalDate start = date(receivedAt), end = date(closedAt);
        if (end.isBefore(start)) throw new IllegalArgumentException("Closure precedes reception");
        return start.datesUntil(end.plusDays(1)).filter(d -> d.getDayOfWeek() != DayOfWeek.SATURDAY
                && d.getDayOfWeek() != DayOfWeek.SUNDAY && !holidays.contains(d)).count();
    }
}
