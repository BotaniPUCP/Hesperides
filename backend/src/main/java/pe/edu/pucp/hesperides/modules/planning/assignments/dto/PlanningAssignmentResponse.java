package pe.edu.pucp.hesperides.modules.planning.assignments.dto;

import java.util.List;
import java.util.UUID;

/**
 * Una frecuencia asignada a un conjunto (SPEC-203 §3.4). {@code ruleKey} es la regla,
 * no una versión: si la frecuencia se edita, la asignación la sigue. Nula cuando la
 * asignación quedó sin frecuencia. {@code warnings} avisa sin bloquear.
 */
public record PlanningAssignmentResponse(long id, long setId, String setName, long activityTypeItemId,
                                         String activityLabel, UUID ruleKey, List<String> warnings) {
}
