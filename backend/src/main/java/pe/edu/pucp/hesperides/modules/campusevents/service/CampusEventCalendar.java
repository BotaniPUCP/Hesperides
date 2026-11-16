package pe.edu.pucp.hesperides.modules.campusevents.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.campusevents.EventOccurrences;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Occurrence;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries.EventRow;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Las ocurrencias de los eventos en un rango, y el «hoy» del calendario en la zona horaria
 * configurada. Lo comparten la agenda, los avisos, el mapa y los días hábiles de incidencias.
 */
@Component
public class CampusEventCalendar {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.forLanguageTag("es-PE"));
    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("H:mm");

    /** Una ocurrencia con su evento, para quien necesita más que la fila de la agenda. */
    public record Dated(EventRow event, LocalDate date) {
    }

    private final CampusEventQueries queries;
    private final Clock clock;
    private final ZoneId zone;

    public CampusEventCalendar(CampusEventQueries queries, Clock clock,
                               @Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this.queries = queries;
        this.clock = clock;
        this.zone = ZoneId.of(timeZone);
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    public LocalTime now() {
        return LocalTime.now(clock.withZone(zone));
    }

    /** Por día y, dentro del día, como los ordena la consulta: primero los de todo el día. */
    public List<Dated> between(LocalDate from, LocalDate to) {
        List<Dated> dated = new ArrayList<>();
        for (EventRow e : queries.between(from, to, null)) {
            EventOccurrences.datesIn(e.rule(), from, to).forEach(d -> dated.add(new Dated(e, d)));
        }
        dated.sort(Comparator.comparing(Dated::date));
        return dated;
    }

    public static Occurrence occurrence(Dated d) {
        EventRow e = d.event();
        return new Occurrence(e.id(), e.name(), e.typeCode(), e.typeLabel(), e.scope().name(), e.zoneId(),
                e.zoneName(), e.zoneActive(), d.date(), e.rule().startTime(), e.rule().endTime());
    }

    public static String day(LocalDate date) {
        return date.format(DAY).replace(".", "");
    }

    /** «de 14:00 a 18:00» o nada si es el día entero. */
    public static String hours(EventRow e) {
        return e.rule().allDay() ? "" : "de " + e.rule().startTime().format(HOUR) + " a " + e.rule().endTime().format(HOUR);
    }
}
