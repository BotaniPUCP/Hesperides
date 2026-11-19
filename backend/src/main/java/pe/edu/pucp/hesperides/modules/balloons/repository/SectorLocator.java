package pe.edu.pucp.hesperides.modules.balloons.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * El sector de cada punto: el de la sección activa que lo contiene (SPEC-113 §5.4). Una
 * sola consulta para todos los globos; nulo si el punto cae fuera de toda sección.
 */
@Repository
@RequiredArgsConstructor
public class SectorLocator {

    private final NamedParameterJdbcTemplate jdbc;

    public List<Long> sectorsOf(List<GeoPoint> points) {
        if (points.isEmpty()) {
            return List.of();
        }
        var params = new MapSqlParameterSource()
                .addValue("lats", points.stream().map(GeoPoint::lat).toArray(Double[]::new))
                .addValue("lons", points.stream().map(GeoPoint::lon).toArray(Double[]::new));
        Long[] sectors = new Long[points.size()];
        jdbc.query("""
                SELECT p.idx, (SELECT z.parent_zone_id FROM zones z
                        JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = 'SECTION'
                       WHERE z.deleted_at IS NULL AND z.is_active
                         AND ST_Covers(z.boundary, ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326))
                       ORDER BY z.id LIMIT 1) AS sector_id
                  FROM unnest(CAST(:lats AS float8[]), CAST(:lons AS float8[])) WITH ORDINALITY AS p(lat, lon, idx)
                """, params, rs -> {
            sectors[rs.getInt("idx") - 1] = rs.getObject("sector_id", Long.class);
        });
        return new ArrayList<>(Arrays.asList(sectors));
    }
}
