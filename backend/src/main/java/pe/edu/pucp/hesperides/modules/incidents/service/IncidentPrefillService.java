package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.PrefillRequest;

import java.time.Instant;

/**
 * Corre el agente sobre un reporte ya guardado (SPEC-201 §3.4). La llamada al modelo ocurre fuera
 * de toda transacción, para no retener la fila mientras el proveedor responde.
 */
@Slf4j
@Service @RequiredArgsConstructor
public class IncidentPrefillService {
    static final String PENDING = "PENDING";
    private final IncidentsRepository incidents;
    private final IncidentPrefillAgent agent;
    private final IncidentPrefillInputs inputs;
    private final IncidentPrefillApplier applier;
    private final TransactionTemplate transactions;

    public void run(Long incidentId) {
        PrefillRequest request = transactions.execute(status -> pendingRequest(incidentId));
        if (request == null) return;
        AgentSuggestion suggestion;
        try {
            suggestion = agent.suggest(request);
        } catch (RuntimeException ex) {
            // El reporte ya está guardado: el fallo solo deja el prellenado para reintentar a mano.
            log.warn("Incident prefill failed incidentId={} cause={}", incidentId, ex.getClass().getSimpleName());
            transactions.executeWithoutResult(status -> fail(incidentId));
            return;
        }
        transactions.executeWithoutResult(status -> applier.apply(incidentId, suggestion));
    }

    private PrefillRequest pendingRequest(Long incidentId) {
        return incidents.findByIdAndDeletedAtIsNull(incidentId)
                .filter(i -> PENDING.equals(i.getPrefillStatus()) && !i.isClosed())
                .map(inputs::of).orElse(null);
    }

    private void fail(Long incidentId) {
        incidents.lockById(incidentId).filter(i -> PENDING.equals(i.getPrefillStatus())).ifPresent(incident -> {
            incident.setPrefillStatus("FAILED");
            incident.setPrefillUpdatedAt(Instant.now());
            incidents.saveAndFlush(incident);
        });
    }

    static boolean pending(Incident incident) {
        return PENDING.equals(incident.getPrefillStatus());
    }
}
