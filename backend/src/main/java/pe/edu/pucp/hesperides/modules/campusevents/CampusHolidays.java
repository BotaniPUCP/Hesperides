package pe.edu.pucp.hesperides.modules.campusevents;

import java.time.LocalDate;
import java.util.Set;

/**
 * Los feriados registrados en el calendario del campus (SPEC-114 D-02). La consumen los días
 * hábiles de incidencias y, después, la regla de maquinaria de corte (5.11).
 */
public interface CampusHolidays {

    /** Sin feriados: para quien no tiene base de datos, como las pruebas unitarias. */
    CampusHolidays NONE = (from, to) -> Set.of();

    Set<LocalDate> between(LocalDate from, LocalDate to);
}
