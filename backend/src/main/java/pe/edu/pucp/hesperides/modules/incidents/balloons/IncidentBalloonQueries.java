package pe.edu.pucp.hesperides.modules.incidents.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Las incidencias que van al mapa (SPEC-113 D-10): activadas y sin cerrar (SPEC-201, rediseño:
 * Reportada → En proceso → Cerrada). Una no activada no es registro oficial. Se clavan en sus
 * coordenadas o, sin ellas, en su zona; sin ninguna de las dos no tienen dónde clavarse.
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
                SELECT i.id, COALESCE(NULLIF(TRIM(i.title), ''), i.description) AS title, st.label AS status_label,
                       u.code AS urgency_code, u.label AS urgency_label,
                       COALESCE(i.latitude, ST_Y(ST_PointOnSurface(z.boundary))) AS lat,
                       COALESCE(i.longitude, ST_X(ST_PointOnSurface(z.boundary))) AS lon,
                       CAST(i.created_at AT TIME ZONE :tz AS date) AS reported_on
                  FROM incidents i
                  JOIN catalog_items st ON st.id = i.status_item_id
                  LEFT JOIN catalog_items u ON u.id = i.urgency_item_id
                  LEFT JOIN zones z ON z.id = i.zone_id AND z.deleted_at IS NULL
                 WHERE i.deleted_at IS NULL AND i.activated_at IS NOT NULL AND st.code <> 'CLOSED'
                   AND (i.latitude IS NOT NULL OR z.boundary IS NOT NULL)
                 ORDER BY i.id""", new MapSqlParameterSource("tz", zone.getId()), (rs, n) -> new OpenIncident(
                rs.getLong("id"), rs.getString("title"), rs.getString("status_label"),
                rs.getString("urgency_code"), rs.getString("urgency_label"), rs.getDouble("lat"),
                rs.getDouble("lon"), rs.getObject("reported_on", LocalDate.class)));
    }
}
