package pe.edu.pucp.hesperides.modules.planning.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Lo que la fuente de «Sección por regar» lee fuera de la planificación: qué es riego y dónde se clava. */
@Repository
@RequiredArgsConstructor
public class IrrigationDueQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /** Los tipos de intervención de la clase Riego: sus filas de planificación son las que riegan. */
    public Set<Long> irrigationTypes() {
        return new HashSet<>(jdbc.queryForList("""
                SELECT t.id FROM catalog_items t
                  JOIN catalog_types tt ON tt.id = t.catalog_type_id AND tt.code = 'INTERVENTION_TYPE'
                  JOIN catalog_items c ON c.id = t.parent_item_id AND c.code = 'RIEGO'
                 WHERE t.deleted_at IS NULL""", new MapSqlParameterSource(), Long.class));
    }

    /** Un punto dentro de cada jardín, en el orden pedido; los sin contorno se omiten. */
    public List<GeoPoint> gardenPoints(Collection<Long> zoneIds) {
        if (zoneIds.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT ST_Y(ST_PointOnSurface(z.boundary)) AS lat, ST_X(ST_PointOnSurface(z.boundary)) AS lon
                  FROM zones z WHERE z.id = ANY(CAST(:ids AS bigint[])) AND z.boundary IS NOT NULL ORDER BY z.id""",
                new MapSqlParameterSource("ids", zoneIds.toArray(Long[]::new)),
                (rs, n) -> new GeoPoint(rs.getDouble("lat"), rs.getDouble("lon")));
    }

    /** El punto de cada ejemplar, o uno dentro de su área si es una mancha. */
    public List<GeoPoint> specimenPoints(Collection<Long> elementIds) {
        if (elementIds.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT ST_Y(COALESCE(e.location, ST_PointOnSurface(e.area))) AS lat,
                       ST_X(COALESCE(e.location, ST_PointOnSurface(e.area))) AS lon
                  FROM green_elements e
                 WHERE e.id = ANY(CAST(:ids AS bigint[])) AND COALESCE(e.location, e.area) IS NOT NULL
                 ORDER BY e.id""",
                new MapSqlParameterSource("ids", elementIds.toArray(Long[]::new)),
                (rs, n) -> new GeoPoint(rs.getDouble("lat"), rs.getDouble("lon")));
    }
}
