package pe.edu.pucp.hesperides.modules.planning.attendance;

import java.time.LocalDate;
import java.util.Set;

/**
 * Como {@link OpenWork}, para ejemplares: una intervención no cancelada con
 * ejemplares pedidos todavía sin completar.
 */
public record OpenSpecimenWork(long interventionId, String code, LocalDate scheduledDate, LocalDate firstStartedDate,
                               Set<Long> elementIds, Set<Long> pendingElementIds) {
}
