package pe.edu.pucp.hesperides.engine.campusevents;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/** Los días en que ocurre un evento: se calculan desde su regla, no se guardan (SPEC-114 D-01). */
public final class EventOccurrences {

    private EventOccurrences() {
    }

    /** Las ocurrencias dentro de {@code from}–{@code to}, ambos incluidos, en orden. */
    public static List<LocalDate> datesIn(EventRule rule, LocalDate from, LocalDate to) {
        LocalDate first = rule.startDate().isAfter(from) ? rule.startDate() : from;
        LocalDate last = rule.endDate().isBefore(to) ? rule.endDate() : to;
        List<LocalDate> dates = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
            if (rule.weekdays().isEmpty() || rule.weekdays().contains(d.getDayOfWeek())) {
                dates.add(d);
            }
        }
        return dates;
    }

    public static boolean occursOn(EventRule rule, LocalDate date) {
        return !datesIn(rule, date, date).isEmpty();
    }

    /** Una repetición puede no caer en ningún día de sus fechas: los martes de un miércoles a un lunes. */
    public static boolean hasAny(EventRule rule) {
        return !datesIn(rule, rule.startDate(), rule.endDate()).isEmpty();
    }

    /**
     * Si el horario del evento se cruza con otro; un lado sin horario es el día entero y se cruza
     * siempre. Los bordes no se cruzan: un evento hasta las 14:00 no choca con algo desde las 14:00.
     */
    public static boolean crosses(EventRule rule, LocalTime from, LocalTime to) {
        if (rule.allDay() || from == null || to == null) {
            return true;
        }
        return rule.startTime().isBefore(to) && from.isBefore(rule.endTime());
    }
}
