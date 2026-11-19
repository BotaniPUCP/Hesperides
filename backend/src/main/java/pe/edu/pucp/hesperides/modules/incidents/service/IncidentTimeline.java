package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentStatusHistory;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentUpdate;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentHistoryRepository;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentUpdatesRepository;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;

import java.util.UUID;

/** Historial que solo agrega filas: estados, revisiones, vínculos y comentarios (SPEC-201 §2.6). */
@Component @RequiredArgsConstructor
public class IncidentTimeline {
    private final IncidentsRepository incidents;
    private final IncidentHistoryRepository history;
    private final IncidentUpdatesRepository updates;
    private final IncidentCatalogs catalogs;

    public void transition(Incident incident, String statusCode, User actor) {
        if (incident.getStatus() != null && incident.getStatus().getCode().equals(statusCode)) return;
        incident.setStatus(catalogs.required(IncidentCatalogs.STATUS, statusCode));
        incidents.saveAndFlush(incident);
        recordStatus(incident, actor);
    }

    public void recordStatus(Incident incident, User actor) {
        var entry = new IncidentStatusHistory();
        entry.setIncident(incident);
        entry.setStatus(incident.getStatus());
        entry.setChangedBy(actor);
        history.saveAndFlush(entry);
    }

    public void record(Incident incident, User actor, String kind, String body) {
        record(incident, actor, kind, body, UUID.randomUUID(), "");
    }

    public void record(Incident incident, User actor, String kind, String body, UUID reference, String hash) {
        var update = new IncidentUpdate();
        update.setIncident(incident);
        update.setAuthor(actor);
        update.setKind(catalogs.required(IncidentCatalogs.UPDATE_KIND, kind));
        update.setBody(body);
        update.setClientReference(reference);
        update.setRequestHash(hash);
        updates.saveAndFlush(update);
    }
}
