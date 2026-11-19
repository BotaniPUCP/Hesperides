package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentReferenceQueries;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Capa de incidencias del mapa (SPEC-201 §3.10) y búsqueda para vincular desde Intervenciones.
 * Solo incidencias activas y abiertas: una no activa todavía no se atiende.
 */
@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class IncidentMapService {
    private final IncidentsRepository incidents;
    private final IncidentAccess access;
    private final IncidentListFilters filters;
    private final IncidentReferenceQueries references;
    private final IncidentDeadlines deadlines;
    private final IncidentResponses responses;

    public MapResponse map(String email) {
        User actor = access.actor(email);
        Instant now = Instant.now();
        var markers = new ArrayList<MapMarkerResponse>();
        long withoutLocation = 0;
        for (Incident incident : incidents.findAll(filters.visibleTo(actor).and(activeAndOpen()))) {
            double[] point = position(incident);
            if (point == null) {
                withoutLocation++;
                continue;
            }
            var status = deadlines.status(incident, now);
            markers.add(new MapMarkerResponse(incident.getId(), incident.getCode(), incident.getTitle(), point[0], point[1],
                    IncidentCatalogs.code(incident.getUrgency()), status == null ? null : status.name()));
        }
        return new MapResponse(List.copyOf(markers), withoutLocation);
    }

    /** Para el buscador del formulario de Intervenciones (§3.8): todas, se buscan en el navegador (SPEC-119). */
    public List<IncidentRefResponse> search(String email) {
        User actor = access.actor(email);
        access.requireManager(actor);
        var spec = filters.visibleTo(actor).and(activeAndOpen());
        return incidents.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt", "id")).stream()
                .map(responses::ref).toList();
    }

    /** El GPS manda; si no hay, un punto dentro de su sección. */
    private double[] position(Incident incident) {
        if (incident.getLatitude() != null) return new double[]{incident.getLatitude(), incident.getLongitude()};
        return references.pointInside(incident.getZoneId()).orElse(null);
    }

    private static Specification<Incident> activeAndOpen() {
        return (root, query, cb) -> cb.and(cb.isNotNull(root.get("activatedAt")), cb.isNull(root.get("closedAt")));
    }
}
