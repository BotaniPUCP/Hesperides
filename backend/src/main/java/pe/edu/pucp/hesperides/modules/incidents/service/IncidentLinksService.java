package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentInterventionLink;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentInterventionLinksRepository;
import pe.edu.pucp.hesperides.modules.interventions.entity.Intervention;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionsRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;

/**
 * Vínculos entre incidencias e intervenciones, desde cualquiera de los dos módulos (SPEC-201 §3.8).
 * Solo coordinación vincula, y solo incidencias activas y abiertas.
 */
@Service @RequiredArgsConstructor
public class IncidentLinksService {
    private final IncidentInterventionLinksRepository links;
    private final InterventionsRepository interventions;
    private final IncidentAccess access;
    private final IncidentTimeline timeline;
    private final IncidentWorkEvents workEvents;
    private final IncidentDetails details;
    private final IncidentWorkLinks workLinks;

    @Transactional
    public DetailResponse link(Long incidentId, LinkRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = linkable(incidentId, actor, request.version());
        attach(incident, lockWork(request.interventionId()), actor);
        return details.of(incident, actor);
    }

    /** Para el buscador del detalle: intervenciones que se pueden vincular (§3.8). */
    @Transactional(readOnly = true)
    public List<InterventionCandidateResponse> candidates(String email) {
        access.requireManager(access.actor(email));
        return workLinks.candidates();
    }

    @Transactional
    public DetailResponse unlink(Long incidentId, Long linkId, ReasonRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = access.managed(incidentId, actor);
        IncidentReviewService.requireOpen(incident);
        var link = liveLink(incidentId, linkId);
        IncidentReviewService.requireVersion(incident, request.version());
        detach(incident, link, actor, request.reason().trim());
        return details.of(incident, actor);
    }

    /** Quita la intervención cancelada y vincula la que la reemplaza en un solo paso. */
    @Transactional
    public DetailResponse replace(Long incidentId, Long linkId, ReplaceRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = linkable(incidentId, actor, request.version());
        var link = liveLink(incidentId, linkId);
        Intervention replacement = lockWork(request.interventionId());
        String reason = request.reason().trim();
        detach(incident, link, actor, reason);
        attach(incident, replacement, actor);
        timeline.record(incident, actor, "INTERVENTION_REPLACED",
                link.getIntervention().getCode() + " → " + replacement.getCode() + " · " + reason);
        return details.of(incident, actor);
    }

    /** Lo que se elige al crear una intervención; el permiso es el mismo que en Incidencias. */
    @Transactional
    public void linkFromIntervention(Long interventionId, List<Long> incidentIds, User actor) {
        if (incidentIds == null || incidentIds.isEmpty()) return;
        access.requireManager(actor);
        Intervention work = lockWork(interventionId);
        incidentIds.stream().distinct().sorted().forEach(id -> {
            Incident incident = access.managed(id, actor);
            requireLinkable(incident);
            attach(incident, work, actor);
        });
    }

    @Transactional
    public void linkFromIntervention(Long interventionId, List<Long> incidentIds, String email) {
        linkFromIntervention(interventionId, incidentIds, access.actor(email));
    }

    @Transactional
    public void unlinkFromIntervention(Long interventionId, Long linkId, String reason, String email) {
        User actor = access.actor(email);
        var link = links.findById(linkId)
                .filter(l -> l.getIntervention().getId().equals(interventionId) && !l.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Intervention link not found"));
        Incident incident = access.managed(link.getIncident().getId(), actor);
        IncidentReviewService.requireOpen(incident);
        detach(incident, link, actor, reason.trim());
    }

    private Incident linkable(Long incidentId, User actor, long version) {
        Incident incident = access.managed(incidentId, actor);
        requireLinkable(incident);
        IncidentReviewService.requireVersion(incident, version);
        return incident;
    }

    private static void requireLinkable(Incident incident) {
        IncidentReviewService.requireOpen(incident);
        if (!incident.isActive()) throw new BusinessRuleException("Activate the incident before linking work");
    }

    private void attach(Incident incident, Intervention work, User actor) {
        if (links.findByIncidentIdAndInterventionIdAndDeletedAtIsNull(incident.getId(), work.getId()).isPresent()) return;
        var link = new IncidentInterventionLink();
        link.setIncident(incident);
        link.setIntervention(work);
        link.setLinkedBy(actor);
        links.saveAndFlush(link);
        workEvents.record(work, actor, IncidentWorkEvents.LINKED, incident.getId(), null);
        timeline.record(incident, actor, "INTERVENTION_LINKED", work.getCode());
        timeline.transition(incident, "IN_PROGRESS", actor);
    }

    private void detach(Incident incident, IncidentInterventionLink link, User actor, String reason) {
        Intervention work = lockWork(link.getIntervention().getId());
        link.remove(actor, reason);
        links.saveAndFlush(link);
        workEvents.record(work, actor, IncidentWorkEvents.UNLINKED, incident.getId(), reason);
        timeline.record(incident, actor, "INTERVENTION_UNLINKED", work.getCode() + " · " + reason);
        if (links.findByIncidentIdAndDeletedAtIsNullOrderByIdAsc(incident.getId()).isEmpty()) {
            timeline.transition(incident, "REPORTED", actor);
        }
    }

    private IncidentInterventionLink liveLink(Long incidentId, Long linkId) {
        return links.findById(linkId).filter(l -> l.getIncident().getId().equals(incidentId) && !l.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Intervention link not found"));
    }

    private Intervention lockWork(Long id) {
        return interventions.findForUpdate(id).filter(w -> !w.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
    }
}
