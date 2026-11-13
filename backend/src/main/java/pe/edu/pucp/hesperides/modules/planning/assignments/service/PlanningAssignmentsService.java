package pe.edu.pucp.hesperides.modules.planning.assignments.service;

import pe.edu.pucp.hesperides.modules.planning.assignments.dto.PlanningAssignmentRequest;
import pe.edu.pucp.hesperides.modules.planning.assignments.dto.PlanningAssignmentResponse;

import java.util.List;
import java.util.UUID;

/** Qué frecuencia se planifica en cada conjunto (SPEC-203 §3.4). */
public interface PlanningAssignmentsService {

    /** Todas las asignaciones activas o, con {@code ruleKey}, solo las de esa regla. */
    List<PlanningAssignmentResponse> list(UUID ruleKey);

    PlanningAssignmentResponse create(PlanningAssignmentRequest request);

    /** Cambia la frecuencia de una asignación; debe ser de la misma actividad. */
    PlanningAssignmentResponse change(long id, PlanningAssignmentRequest request);

    void delete(long id);
}
