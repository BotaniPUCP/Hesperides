package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.CloseRequest;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.DetailResponse;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;

import java.time.Instant;

/**
 * Solo coordinación cierra, y solo con todo el trabajo vinculado validado (SPEC-201 §3.8).
 * El plazo se congela al cerrar para el reporte mensual. Cerrada es final en esta versión.
 */
@Service @RequiredArgsConstructor
public class IncidentClosureService {
    private final IncidentsRepository incidents;
    private final IncidentAccess access;
    private final IncidentRules rules;
    private final IncidentWorkLinks workLinks;
    private final IncidentDeadlines deadlines;
    private final IncidentTimeline timeline;
    private final IncidentDetails details;

    @Transactional
    public DetailResponse close(Long id, CloseRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = access.managed(id, actor);
        String summary = request.resolutionSummary().trim();
        if (incident.isClosed()) return alreadyClosed(incident, actor, summary);
        IncidentReviewService.requireVersion(incident, request.version());
        workLinks.lockAll(id);
        var blockers = rules.closureBlockers(incident);
        if (!blockers.isEmpty()) throw new BusinessRuleException("Incident cannot be closed yet: " + blockers);
        Instant now = Instant.now();
        incident.setDeadlineMet(deadlines.metAtClosure(incident, now));
        incident.setClosedAt(now);
        incident.setClosedBy(actor);
        incident.setResolutionSummary(summary);
        timeline.transition(incident, "CLOSED", actor);
        timeline.record(incident, actor, "CLOSED", summary);
        return details.of(incident, actor);
    }

    /** Repetir el mismo cierre es inofensivo; otro texto sería reescribir lo cerrado. */
    private DetailResponse alreadyClosed(Incident incident, User actor, String summary) {
        if (!summary.equals(incident.getResolutionSummary())) {
            throw new ConflictException("Incident already closed with another summary");
        }
        return details.of(incident, actor);
    }
}
