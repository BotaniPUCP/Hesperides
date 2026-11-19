package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.interventions.entity.Intervention;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionEvent;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionEventsRepository;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionsRepository;

import java.time.Instant;
import java.util.Map;

/**
 * El vínculo también queda en el historial de la intervención, y le sube la versión para que
 * nadie la guarde sobre una vista vieja (SPEC-201 §3.8: un vínculo, visible en ambos módulos).
 */
@Component @RequiredArgsConstructor
public class IncidentWorkEvents {
    public static final String LINKED = "INCIDENT_LINKED";
    public static final String UNLINKED = "INCIDENT_UNLINKED";
    private final InterventionsRepository interventions;
    private final InterventionEventsRepository events;

    public void record(Intervention work, User actor, String action, Long incidentId, String reason) {
        work.setVersion(work.getVersion() + 1);
        interventions.saveAndFlush(work);
        var event = new InterventionEvent();
        event.setInterventionId(work.getId());
        event.setActorUserId(actor.getId());
        event.setActionCode(action);
        event.setFromStatusItemId(work.getPlanningStatusItemId());
        event.setToStatusItemId(work.getPlanningStatusItemId());
        event.setOccurredAt(Instant.now());
        event.setReason(reason);
        event.setDetails(Map.of("incidentId", incidentId));
        events.saveAndFlush(event);
    }
}
