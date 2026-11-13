package pe.edu.pucp.hesperides.modules.planning.assignments.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.planning.assignments.dto.PlanningAssignmentRequest;
import pe.edu.pucp.hesperides.modules.planning.assignments.dto.PlanningAssignmentResponse;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.Assignment;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.FrequencyRef;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Asignaciones de frecuencias a conjuntos (SPEC-203 §3.4). Una por conjunto y
 * actividad; solo de personal propio y con algo que cumplir (D-10).
 */
@Service
@RequiredArgsConstructor
public class PlanningAssignmentsServiceImpl implements PlanningAssignmentsService {

    private static final String ENTITY = "PLANNING_ASSIGNMENT";

    private final PlanningAssignmentsQueries queries;
    private final AuditService audit;

    @Override
    @Transactional(readOnly = true)
    public List<PlanningAssignmentResponse> list(UUID ruleKey) {
        var found = ruleKey == null ? queries.active() : queries.byRule(ruleKey);
        return found.stream().map(a -> response(a, List.of())).toList();
    }

    @Override
    @Transactional
    public PlanningAssignmentResponse create(PlanningAssignmentRequest request) {
        if (request.setId() == null) {
            throw new BusinessRuleException("Elige el conjunto");
        }
        String setName = queries.activeSetName(request.setId())
                .orElseThrow(() -> new BusinessRuleException("El conjunto no existe o fue dado de baja"));
        FrequencyRef frequency = plannable(request.frequencyId());
        queries.findBySetAndActivity(request.setId(), frequency.activityId()).ifPresent(a -> {
            throw new ConflictException("«" + setName + "» ya tiene una planificación de " + frequency.activityLabel()
                    + ". Edítala en vez de crear otra.");
        });
        long id = queries.insert(request.setId(), frequency.activityId(), frequency.ruleKey());
        audit.record(AuditActionCode.PLANNING_ASSIGNMENT_CREATED, ENTITY, id, details(request.setId(), frequency));
        return saved(id);
    }

    @Override
    @Transactional
    public PlanningAssignmentResponse change(long id, PlanningAssignmentRequest request) {
        Assignment current = load(id);
        FrequencyRef frequency = plannable(request.frequencyId());
        if (frequency.activityId() != current.activityId()) {
            throw new BusinessRuleException("La frecuencia nueva debe ser de " + current.activityLabel());
        }
        queries.changeRule(id, frequency.ruleKey());
        audit.record(AuditActionCode.PLANNING_ASSIGNMENT_UPDATED, ENTITY, id, details(current.setId(), frequency));
        return saved(id);
    }

    @Override
    @Transactional
    public void delete(long id) {
        Assignment current = load(id);
        queries.softDelete(id);
        audit.record(AuditActionCode.PLANNING_ASSIGNMENT_DELETED, ENTITY, id,
                Map.of("setId", current.setId(), "activityTypeItemId", current.activityId()));
    }

    /** Solo la versión vigente de una regla de personal propio que no sea a demanda (D-10). */
    private FrequencyRef plannable(long frequencyId) {
        FrequencyRef f = queries.frequency(frequencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Frecuencia no encontrada"));
        if (!f.current()) {
            throw new BusinessRuleException("Esa frecuencia ya no está vigente; elige la actual");
        }
        if (!"IN_HOUSE".equals(f.regime())) {
            throw new BusinessRuleException("Las frecuencias tercerizadas no se planifican");
        }
        if ("ON_DEMAND".equals(f.ruleTypeCode())) {
            throw new BusinessRuleException("Una frecuencia a demanda no se planifica");
        }
        return f;
    }

    private PlanningAssignmentResponse saved(long id) {
        Assignment a = load(id);
        return response(a, a.ruleKey() == null ? List.of() : queries.overlaps(a.setId(), a.activityId(), a.ruleKey()));
    }

    private Assignment load(long id) {
        return queries.find(id).orElseThrow(() -> new ResourceNotFoundException("Asignación no encontrada"));
    }

    private static PlanningAssignmentResponse response(Assignment a, List<String> warnings) {
        return new PlanningAssignmentResponse(a.id(), a.setId(), a.setName(), a.activityId(), a.activityLabel(),
                a.ruleKey(), warnings);
    }

    private static Map<String, Object> details(long setId, FrequencyRef f) {
        var out = new HashMap<String, Object>();
        out.put("setId", setId);
        out.put("frequencyId", f.id());
        out.put("activityTypeItemId", f.activityId());
        return out;
    }
}
