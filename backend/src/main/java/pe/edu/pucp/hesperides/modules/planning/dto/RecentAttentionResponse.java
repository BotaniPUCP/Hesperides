package pe.edu.pucp.hesperides.modules.planning.dto;

import java.time.LocalDate;

/** Un jardín atendido antes del mínimo de su regla efectiva (SPEC-203 §3.3). */
public record RecentAttentionResponse(long zoneId, String displayName, LocalDate lastDate, int daysSinceLast,
                                      int minDays) {
}
