package pe.edu.pucp.hesperides.modules.planning.attendance;

import java.time.LocalDate;
import java.util.Set;

/**
 * Una intervención no cancelada con jardines pendientes. {@code firstStartedDate} es
 * nulo si ninguna de sus ubicaciones empezó; {@code zoneIds} son solo las secciones
 * pedidas que la intervención incluye.
 */
public record OpenWork(long interventionId, String code, LocalDate scheduledDate, LocalDate firstStartedDate,
                       Set<Long> zoneIds, Set<Long> pendingZoneIds) {
}
