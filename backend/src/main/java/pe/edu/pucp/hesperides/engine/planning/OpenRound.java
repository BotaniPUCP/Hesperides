package pe.edu.pucp.hesperides.engine.planning;

import java.time.LocalDate;
import java.util.Set;

/** Una intervención abierta; {@code firstStartedDate} nulo significa que nadie empezó. */
public record OpenRound(long interventionId, String code, LocalDate scheduledDate, LocalDate firstStartedDate,
                        Set<Long> zoneIds) {
}
