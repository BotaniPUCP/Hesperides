package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.incidents.IncidentCode;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.CreateIncidentRequest;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.CreationResult;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentCodeCounters;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

/** Captura de dos campos (SPEC-201 §3.2): se guarda antes de cualquier llamada a la IA. */
@Service @RequiredArgsConstructor
public class IncidentCaptureService {
    /** El año del código es el de la recepción en el campus, no el del servidor. */
    static final ZoneId CAMPUS_ZONE = ZoneId.of("America/Lima");
    static final String DEFAULT_REQUESTER = "Áreas verdes (hallazgo en campo)";
    private final IncidentsRepository incidents;
    private final IncidentCodeCounters codes;
    private final IncidentAccess access;
    private final IncidentCatalogs catalogs;
    private final IncidentFields fields;
    private final IncidentTimeline timeline;
    private final IncidentDetails details;
    private final RequestFingerprint fingerprint;
    private final ApplicationEventPublisher events;

    @Transactional
    public CreationResult create(CreateIncidentRequest request, UUID reference, String email) {
        User actor = access.lockedActor(email);
        String hash = fingerprint.of(request);
        var existing = incidents.findByReportedByIdAndClientReferenceAndDeletedAtIsNull(actor.getId(), reference);
        if (existing.isPresent()) {
            fingerprint.requireSame(existing.get().getRequestHash(), hash);
            return new CreationResult(details.of(existing.get(), actor), false);
        }
        Incident incident = newIncident(request, actor, reference, hash);
        incidents.saveAndFlush(incident);
        timeline.recordStatus(incident, actor);
        events.publishEvent(new IncidentReported(incident.getId()));
        return new CreationResult(details.of(incident, actor), true);
    }

    private Incident newIncident(CreateIncidentRequest request, User actor, UUID reference, String hash) {
        Incident incident = new Incident();
        Instant now = Instant.now();
        int year = now.atZone(CAMPUS_ZONE).getYear();
        incident.setCode(IncidentCode.format(year, codes.next(year)));
        String description = request.description().trim();
        incident.setOriginalDescription(description);
        incident.setDescription(description);
        var severity = catalogs.required(IncidentCatalogs.URGENCY, request.reportedUrgencyCode());
        incident.setReportedUrgency(severity);
        incident.setUrgency(severity);
        incident.setStatus(catalogs.required(IncidentCatalogs.STATUS, "REPORTED"));
        fields.applyLocation(incident, request.zoneId(), request.locationReference(), request.latitude(), request.longitude());
        fields.applyRequester(incident, request.requestedByOrganizationId(), defaultRequester(request),
                request.requesterContactId(), request.requestedForOrganizationId());
        incident.setSource(catalogs.optional(IncidentCatalogs.SOURCE, request.sourceCode()));
        incident.setExternalCode(IncidentFields.clean(request.externalCode()));
        incident.setReportedBy(actor);
        incident.setClientReference(reference);
        incident.setRequestHash(hash);
        var led = access.ledTeams(actor);
        if (led.size() == 1) incident.setTeam(led.getFirst());
        if (access.manages(actor)) activate(incident, actor, now);
        return incident;
    }

    private static String defaultRequester(CreateIncidentRequest request) {
        if (request.requestedByOrganizationId() != null) return IncidentFields.clean(request.requestedByName());
        String name = IncidentFields.clean(request.requestedByName());
        return name == null ? DEFAULT_REQUESTER : name;
    }

    /** Lo que reporta coordinación nace activo (decisión del 7 nov 2026). */
    private static void activate(Incident incident, User actor, Instant now) {
        incident.setActivatedAt(now);
        incident.setActivatedBy(actor);
    }
}
