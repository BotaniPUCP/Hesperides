package pe.edu.pucp.hesperides.modules.campusevents.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.engine.campusevents.EventRule;
import pe.edu.pucp.hesperides.engine.campusevents.EventScope;
import pe.edu.pucp.hesperides.engine.campusevents.Garden;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Lecturas del calendario que no son la entidad: catálogo, zonas y jardines (SPEC-114). */
@Repository
@RequiredArgsConstructor
public class CampusEventQueries {

    /**
     * Un evento vigente con lo que hace falta para mostrarlo y saber a quién toca.
     * {@code reachZoneId} es la zona con que se mide el alcance: una subsección cuenta por su sección.
     */
    public record EventRow(long id, String name, String typeCode, String typeLabel, EventScope scope, Long zoneId,
                           String zoneName, boolean zoneActive, Long reachZoneId, EventRule rule) {
    }

    public record TypeRow(long id, String code, String label) {
    }

    public record NamedGarden(String name, Garden garden) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public Optional<TypeRow> type(String code) {
        return jdbc.query("""
                SELECT i.id, i.code, i.label FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'CAMPUS_EVENT_TYPE' AND i.code = :code AND i.deleted_at IS NULL""",
                Map.of("code", code), (rs, n) -> new TypeRow(rs.getLong(1), rs.getString(2), rs.getString(3)))
                .stream().findFirst();
    }

    /** El tipo de una zona activa (SECTOR, SECTION, SUBSECTION); vacío si no existe o se dio de baja. */
    public Optional<String> zoneType(long zoneId) {
        return jdbc.queryForList("""
                SELECT t.code FROM zones z JOIN catalog_items t ON t.id = z.zone_type_item_id
                 WHERE z.id = :id AND z.is_active AND z.deleted_at IS NULL""", Map.of("id", zoneId), String.class)
                .stream().findFirst();
    }

    /** Los eventos vigentes cuyas fechas se cruzan con el rango; {@code id} filtra a uno. */
    public List<EventRow> between(LocalDate from, LocalDate to, Long id) {
        return jdbc.query("""
                SELECT e.id, e.name, t.code, t.label, e.scope, e.zone_id, z.name AS zone_name,
                       COALESCE(z.is_active AND z.deleted_at IS NULL, TRUE) AS zone_active,
                       CASE WHEN zt.code = 'SUBSECTION' THEN z.parent_zone_id ELSE e.zone_id END AS reach_zone,
                       e.start_date, e.end_date, e.start_time, e.end_time, e.weekdays
                  FROM campus_events e
                  JOIN catalog_items t ON t.id = e.type_item_id
                  LEFT JOIN zones z ON z.id = e.zone_id
                  LEFT JOIN catalog_items zt ON zt.id = z.zone_type_item_id
                 WHERE e.deleted_at IS NULL AND e.start_date <= :to AND e.end_date >= :from
                   AND (CAST(:id AS bigint) IS NULL OR e.id = CAST(:id AS bigint))
                 ORDER BY e.start_time NULLS FIRST, e.name, e.id""",
                new MapSqlParameterSource().addValue("from", from).addValue("to", to).addValue("id", id),
                CampusEventQueries::eventRow);
    }

    private static EventRow eventRow(ResultSet rs, int n) throws SQLException {
        EventRule rule = new EventRule(rs.getObject("start_date", LocalDate.class), rs.getObject("end_date", LocalDate.class),
                weekdays(rs.getArray("weekdays")), rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class));
        return new EventRow(rs.getLong("id"), rs.getString("name"), rs.getString("code"), rs.getString("label"),
                EventScope.valueOf(rs.getString("scope")), rs.getObject("zone_id", Long.class), rs.getString("zone_name"),
                rs.getBoolean("zone_active"), rs.getObject("reach_zone", Long.class), rule);
    }

    private static Set<DayOfWeek> weekdays(Array array) throws SQLException {
        Set<DayOfWeek> days = new HashSet<>();
        if (array != null) {
            for (Object day : (Object[]) array.getArray()) {
                days.add(DayOfWeek.of(((Number) day).intValue()));
            }
        }
        return days;
    }

    /** La sección y el sector de cada zona o lugar elegido, con su nombre para el aviso. */
    public List<NamedGarden> gardens(Collection<Long> zoneIds, Collection<Long> placeIds) {
        return jdbc.query("""
                WITH picked AS (
                    SELECT unnest(CAST(:zones AS bigint[])) AS id
                    UNION SELECT p.zone_id FROM places p WHERE p.id = ANY(CAST(:places AS bigint[])) AND p.zone_id IS NOT NULL
                    UNION SELECT c.zone_id FROM places c
                     WHERE c.parent_place_id = ANY(CAST(:places AS bigint[])) AND c.zone_id IS NOT NULL AND c.deleted_at IS NULL)
                SELECT z.name,
                       CASE t.code WHEN 'SECTION' THEN z.id WHEN 'SUBSECTION' THEN z.parent_zone_id END AS section_id,
                       CASE t.code WHEN 'SECTOR' THEN z.id WHEN 'SECTION' THEN z.parent_zone_id
                            WHEN 'SUBSECTION' THEN (SELECT s.parent_zone_id FROM zones s WHERE s.id = z.parent_zone_id) END AS sector_id
                  FROM picked JOIN zones z ON z.id = picked.id JOIN catalog_items t ON t.id = z.zone_type_item_id
                 ORDER BY z.name""",
                new MapSqlParameterSource().addValue("zones", zoneIds.toArray(Long[]::new))
                        .addValue("places", placeIds.toArray(Long[]::new)),
                (rs, n) -> new NamedGarden(rs.getString("name"),
                        new Garden(rs.getObject("section_id", Long.class), rs.getObject("sector_id", Long.class))));
    }

    /** Un punto dentro de la zona; un sector sin contorno propio usa el de sus secciones. */
    public Optional<GeoPoint> point(long zoneId) {
        return jdbc.query("""
                SELECT ST_Y(p), ST_X(p) FROM (SELECT ST_PointOnSurface(COALESCE(z.boundary,
                         (SELECT ST_Union(s.boundary) FROM zones s WHERE s.parent_zone_id = z.id AND s.deleted_at IS NULL))) AS p
                  FROM zones z WHERE z.id = :id) q WHERE p IS NOT NULL""",
                Map.of("id", zoneId), (rs, n) -> new GeoPoint(rs.getDouble(1), rs.getDouble(2))).stream().findFirst();
    }
}
