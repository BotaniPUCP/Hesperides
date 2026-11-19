package pe.edu.pucp.hesperides.modules.incidents.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;
import java.util.Map;

/**
 * Incidencias vistas desde Intervenciones. Se filtran con el alcance propio de cada incidencia,
 * independiente del permiso sobre el trabajo compartido (SPEC-201 §3.1).
 */
@Repository @RequiredArgsConstructor
public class IncidentLinkQueries {
    private final JdbcTemplate jdbc;
    private static final String SCOPE = """
         i.deleted_at IS NULL AND (? IN ('ADMIN','COORDINADOR') OR i.reported_by_user_id=? OR (?='SUPERVISOR' AND
         EXISTS(SELECT 1 FROM teams t WHERE t.id=i.team_id AND t.is_active AND t.deleted_at IS NULL
          AND t.supervisor_user_id=?)))
        """;

    public void requireIncident(Long id, User user) {
        if (!canReadIncident(id, user)) throw new ResourceNotFoundException("Incident not found");
    }

    public boolean canReadIncident(Long id, User user) {
        Boolean visible = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM incidents i WHERE i.id=? AND " + SCOPE + ")",
                Boolean.class, scoped(id, user));
        return Boolean.TRUE.equals(visible);
    }

    public List<Map<String, Object>> sourceIncidents(Long interventionId, User user) {
        return jdbc.queryForList("""
            SELECT i.id, i.code, i.title, s.code AS "statusCode", (i.activated_at IS NOT NULL) AS active, l.id AS "linkId"
            FROM incident_intervention_links l JOIN incidents i ON i.id=l.incident_id
            JOIN catalog_items s ON s.id=i.status_item_id
            WHERE l.intervention_id=? AND l.deleted_at IS NULL AND
            """ + SCOPE + " ORDER BY i.id", scoped(interventionId, user));
    }

    private static Object[] scoped(Long id, User user) {
        return new Object[]{id, user.getRoleCode(), user.getId(), user.getRoleCode(), user.getId()};
    }
}
