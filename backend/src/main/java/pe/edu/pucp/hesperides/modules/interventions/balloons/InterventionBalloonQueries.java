package pe.edu.pucp.hesperides.modules.interventions.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Las ubicaciones de intervención que van al mapa (SPEC-113 §5.1): las que están en
 * ejecución y, si la clase es Riego, también las programadas para hoy sin empezar. El
 * ancla es el punto de la ubicación o, sin él, el de su sección o el de la sección de
 * su lugar.
 */
@Repository
@RequiredArgsConstructor
public class InterventionBalloonQueries {

    public static final String IRRIGATION_CLASS = "RIEGO";

    /** Una fila por ubicación; {@code done} y {@code total} son de toda la intervención. */
    public record ActiveLocation(long interventionId, String classCode, String activityLabel, String assignee,
                                 String locationStatus, LocalTime startedAt, double latitude, double longitude,
                                 int done, int total) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public List<ActiveLocation> active(LocalDate today, ZoneId zone) {
        var params = new MapSqlParameterSource().addValue("today", today).addValue("tz", zone.getId())
                .addValue("irrigation", IRRIGATION_CLASS);
        return jdbc.query("""
                SELECT i.id, cls.code AS class_code, COALESCE(typ.label, cls.label) AS activity,
                       NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS assignee, ls.code AS location_status,
                       CAST((l.started_at AT TIME ZONE 'UTC') AT TIME ZONE :tz AS time) AS started,
                       ST_Y(a.pt) AS lat, ST_X(a.pt) AS lon,
                       (SELECT count(*) FROM intervention_locations d JOIN catalog_items ds ON ds.id = d.status_item_id
                         WHERE d.intervention_id = i.id AND d.deleted_at IS NULL
                           AND ds.code IN ('COMPLETED', 'VALIDATED')) AS done,
                       (SELECT count(*) FROM intervention_locations d JOIN catalog_items ds ON ds.id = d.status_item_id
                         WHERE d.intervention_id = i.id AND d.deleted_at IS NULL AND ds.code <> 'CANCELLED') AS total
                  FROM interventions i
                  JOIN catalog_items plan ON plan.id = i.planning_status_item_id AND plan.code <> 'CANCELLED'
                  JOIN catalog_items cls ON cls.id = i.intervention_class_item_id
                  LEFT JOIN catalog_items typ ON typ.id = i.intervention_type_item_id
                  LEFT JOIN users u ON u.id = i.assigned_to_user_id
                  JOIN intervention_locations l ON l.intervention_id = i.id AND l.deleted_at IS NULL
                  JOIN catalog_items ls ON ls.id = l.status_item_id
                  LEFT JOIN zones z ON z.id = l.zone_id AND z.deleted_at IS NULL
                  LEFT JOIN places p ON p.id = l.place_id AND p.deleted_at IS NULL
                  LEFT JOIN zones pz ON pz.id = p.zone_id AND pz.deleted_at IS NULL
                 CROSS JOIN LATERAL (SELECT COALESCE(l.location, ST_PointOnSurface(z.boundary),
                                                     ST_PointOnSurface(pz.boundary)) AS pt) a
                 WHERE i.deleted_at IS NULL AND a.pt IS NOT NULL
                   AND (ls.code = 'IN_PROGRESS'
                        OR (cls.code = :irrigation AND i.scheduled_date = :today AND ls.code IN ('PLANNED', 'ASSIGNED')))
                 ORDER BY i.id, l.id""", params, (rs, n) -> new ActiveLocation(
                rs.getLong("id"), rs.getString("class_code"), rs.getString("activity"), rs.getString("assignee"),
                rs.getString("location_status"), rs.getObject("started", LocalTime.class),
                rs.getDouble("lat"), rs.getDouble("lon"), rs.getInt("done"), rs.getInt("total")));
    }
}
