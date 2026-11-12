package pe.edu.pucp.hesperides.modules.planning.dto;

import pe.edu.pucp.hesperides.engine.planning.PlanningState;
import pe.edu.pucp.hesperides.engine.planning.Progress;
import pe.edu.pucp.hesperides.engine.planning.Rhythm;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Una fila de planificación (SPEC-203 §3.2): una asignación de una frecuencia a un conjunto. {@code days} depende de {@code state}. El avance
 * y los «sin registro previo» cuentan jardines y ejemplares juntos: cada uno es una unidad.
 */
public record PlanningRowResponse(long setId, String setName, int zoneCount, int elementCount,
                                  long activityTypeItemId,
                                  String activityLabel, String ruleKind, boolean ownRule, Rhythm rhythm,
                                  PlanningState state, Integer days, LocalDate lastDate, Integer daysSinceLast,
                                  Progress progress, int neverAttendedCount, OpenIntervention openIntervention,
                                  LocalDate estimatedDate, Integer yearCount, LocalDate suggestedDate,
                                  long assignmentId, UUID ruleKey) {

    /** {@code startedDate} es nulo mientras ningún jardín haya empezado. */
    public record OpenIntervention(long id, String code, LocalDate scheduledDate, LocalDate startedDate) {
    }
}
