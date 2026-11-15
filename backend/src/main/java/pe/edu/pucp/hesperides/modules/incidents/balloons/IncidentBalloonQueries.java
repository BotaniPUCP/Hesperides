package pe.edu.pucp.hesperides.modules.incidents.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Las incidencias que van al mapa (SPEC-113 D-10): aprobadas, sin resolver y con
 * coordenadas. Las pendientes de aprobación o con corrección pedida no son registro
 * oficial; una sin coordenadas no tiene dónde clavarse.
 */
@Repository
@RequiredArgsConstructor
public class IncidentBalloonQueries {

    public record OpenIncident(long id, String description, String statusLabel, String urgencyCode,
                               String urgencyLabel, double latitude, double longitude, LocalDate reportedOn) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public List<OpenIncident> openOnTheMap(ZoneId zone) {
        return jdbc.query("""
                SELECT i.id, i.description, st.label AS status_label, u.code AS urgency_code, u.label AS urgency_label,
                       i.latitude, i.longitude, CAST(i.created_at AT TIME ZONE :tz AS date) AS reported_on
                  FROM incidents i
                  JOIN catalog_items st ON st.id = i.status_item_id
                  LEFT JOIN catalog_items u ON u.id = i.urgency_item_id
                 WHERE i.deleted_at IS NULL
                   AND st.code IN ('OPEN', 'IN_PROGRESS', 'RESOLUTION_OBSERVED')
                   AND i.latitude IS NOT NULL AND i.longitude IS NOT NULL
                 ORDER BY i.id""", new MapSqlParameterSource("tz", zone.getId()), (rs, n) -> new OpenIncident(
                rs.getLong("id"), rs.getString("description"), rs.getString("status_label"),
                rs.getString("urgency_code"), rs.getString("urgency_label"), rs.getDouble("latitude"),
                rs.getDouble("longitude"), rs.getObject("reported_on", LocalDate.class)));
    }
}
