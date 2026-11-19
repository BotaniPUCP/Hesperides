package pe.edu.pucp.hesperides.engine.machinery;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

/**
 * La maquinaria de corte solo se programa sábados, domingos y feriados (SPEC-115, REQ 5.11):
 * «estás haciendo tu clase… y suena una motosierra al costado».
 */
public final class MachineryDays {

    private MachineryDays() {
    }

    public static boolean allowed(LocalDate date, Set<LocalDate> holidays) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY || holidays.contains(date);
    }
}
