package pe.edu.pucp.hesperides.shared.time;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;

public record DailyTimeWindow(LocalTime start, LocalTime end) {
    public static Optional<DailyTimeWindow> parse(String value) {
        if (!value.matches("[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}")) {
            return Optional.empty();
        }
        try {
            LocalTime start = LocalTime.parse(value.substring(0, 5));
            LocalTime end = LocalTime.parse(value.substring(6));
            return start.isBefore(end) ? Optional.of(new DailyTimeWindow(start, end)) : Optional.empty();
        } catch (DateTimeParseException ex) {
            return Optional.empty();
        }
    }

    public boolean excludes(LocalTime time) {
        return time != null && (time.isBefore(start) || time.isAfter(end));
    }
}
