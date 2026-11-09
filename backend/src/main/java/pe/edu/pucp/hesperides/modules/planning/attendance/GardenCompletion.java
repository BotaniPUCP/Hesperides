package pe.edu.pucp.hesperides.modules.planning.attendance;

import java.time.LocalDate;

/** Un jardín completado por el capataz para una actividad, en su fecha local (SPEC-203 §5.4). */
public record GardenCompletion(long zoneId, long interventionId, LocalDate date) {
}
