package pe.edu.pucp.hesperides.engine.planning;

import java.time.LocalDate;
import java.util.Set;

/**
 * Una intervención abierta; {@code firstStartedDate} nulo significa que nadie empezó.
 * {@code pendingZoneIds} son sus jardines sin completar: solo esos la mantienen abierta
 * para un conjunto, aunque la intervención siga abierta en otros (SPEC-203 §5.5).
 */
public record OpenRound(long interventionId, String code, LocalDate scheduledDate, LocalDate firstStartedDate,
                        Set<Long> zoneIds, Set<Long> pendingZoneIds) {
}
