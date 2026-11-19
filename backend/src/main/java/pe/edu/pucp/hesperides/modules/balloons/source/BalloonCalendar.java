package pe.edu.pucp.hesperides.modules.balloons.source;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * El «ahora» de los globos en la zona horaria configurada, y los textos de tiempo de las
 * fichas. Las fuentes lo comparten para que «hoy» signifique lo mismo en todas.
 */
@Component
public class BalloonCalendar {

    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("H:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.forLanguageTag("es-PE"));

    private final Clock clock;
    private final ZoneId zone;

    public BalloonCalendar(Clock clock, @Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this.clock = clock;
        this.zone = ZoneId.of(timeZone);
    }

    public Instant now() {
        return clock.instant();
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    public ZoneId zone() {
        return zone;
    }

    public String hour(LocalTime time) {
        return time.format(HOUR);
    }

    public String hour(Instant instant) {
        return hour(instant.atZone(zone).toLocalTime());
    }

    public String day(LocalDate date) {
        return date.format(DAY).replace(".", "");
    }

    /** «1 día», «3 días». */
    public static String days(long days) {
        return days == 1 ? "1 día" : days + " días";
    }

    /** «Hoy», «Hace 1 día», «Hace 3 días». */
    public static String ago(long days) {
        return days <= 0 ? "Hoy" : "Hace " + days(days);
    }
}
