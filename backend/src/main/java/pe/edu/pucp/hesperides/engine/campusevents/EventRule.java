package pe.edu.pucp.hesperides.engine.campusevents;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

/**
 * La regla de un evento del campus (SPEC-114 D-01): sus fechas, ambas incluidas, los días de
 * la semana en que ocurre (vacío = todos) y su horario, el mismo cada día (nulo = el día entero).
 */
public record EventRule(LocalDate startDate, LocalDate endDate, Set<DayOfWeek> weekdays,
                        LocalTime startTime, LocalTime endTime) {

    public EventRule {
        weekdays = weekdays == null ? Set.of() : Set.copyOf(weekdays);
    }

    public boolean allDay() {
        return startTime == null;
    }
}
