package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;

/**
 * Coordinación revisa lo prellenado, puede modificar todo y al final activa (SPEC-201 §3.6).
 * Lo que envió el capataz (texto y gravedad originales) nunca se toca.
 */
@Service @RequiredArgsConstructor
public class IncidentReviewService {
    private final IncidentsRepository incidents;
    private final IncidentAccess access;
    private final IncidentReviewFields reviewFields;
    private final IncidentRules rules;
    private final IncidentTimeline timeline;
    private final IncidentDetails details;
    private final ApplicationEventPublisher events;
    private final ObjectMapper mapper;

    @Transactional
    public DetailResponse update(Long id, ReviewIncidentRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = openForManager(id, actor, request.version());
        var before = IncidentSnapshot.of(incident);
        reviewFields.apply(incident, request);
        var after = IncidentSnapshot.of(incident);
        var changed = IncidentSnapshot.changed(before, after);
        if (!changed.isEmpty()) {
            var edited = new ArrayList<>(incident.getEditedFields());
            changed.stream().filter(f -> !edited.contains(f)).forEach(edited::add);
            incident.setEditedFields(edited);
            incidents.saveAndFlush(incident);
            timeline.record(incident, actor, "REVIEW", mapper.writeValueAsString(Map.of("before", before, "after", after)));
        }
        return details.of(incident, actor);
    }

    @Transactional
    public DetailResponse activate(Long id, VersionRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = access.managed(id, actor);
        if (incident.isActive()) return details.of(incident, actor);
        requireOpen(incident);
        requireVersion(incident, request.version());
        var gaps = rules.activationGaps(incident);
        if (!gaps.isEmpty()) throw new BusinessRuleException("Incident cannot be activated yet: " + gaps);
        incident.setActivatedAt(Instant.now());
        incident.setActivatedBy(actor);
        incidents.saveAndFlush(incident);
        timeline.record(incident, actor, "ACTIVATED", "Incidencia activada");
        return details.of(incident, actor);
    }

    @Transactional
    public DetailResponse retryPrefill(Long id, String email) {
        User actor = access.actor(email);
        Incident incident = access.managed(id, actor);
        requireOpen(incident);
        if (!"PENDING".equals(incident.getPrefillStatus())) {
            incident.setPrefillStatus("PENDING");
            incidents.saveAndFlush(incident);
            events.publishEvent(new IncidentReported(id));
        }
        return details.of(incident, actor);
    }

    private Incident openForManager(Long id, User actor, long version) {
        Incident incident = access.managed(id, actor);
        requireOpen(incident);
        requireVersion(incident, version);
        return incident;
    }

    static void requireOpen(Incident incident) {
        if (incident.isClosed()) throw new BusinessRuleException("Incident already closed");
    }

    static void requireVersion(Incident incident, long version) {
        if (incident.getVersion() != version) throw new ConflictException("Incident changed; reload before editing");
    }
}
