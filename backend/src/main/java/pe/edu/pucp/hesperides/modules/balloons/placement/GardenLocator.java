package pe.edu.pucp.hesperides.modules.balloons.placement;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;

import java.util.Arrays;
import java.util.List;

/**
 * El jardín (sección activa) de cada globo y qué puntos caen dentro de uno (SPEC-113 §5.3b).
 * Un globo fuera de toda sección va a la más cercana, salvo que esté sobre un ejemplar: los
 * árboles de veredas y plazas no tienen jardín y su globo se queda sobre ellos.
 */
@Repository
@RequiredArgsConstructor
public class GardenLocator {

    /** Hasta aquí un globo se considera sobre un ejemplar suelto. */
    static final double SPECIMEN_METERS = 1.5;
    /** Más lejos que esto de todo jardín, el globo se queda donde está: no hay jardín al que ir. */
    static final double NEAREST_GARDEN_METERS = 100;

    private static final String SECTIONS = """
            SELECT z.id, z.boundary FROM zones z
              JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = 'SECTION'
             WHERE z.deleted_at IS NULL AND z.is_active
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<GardenSpot> spotsOf(List<GeoPoint> points) {
        if (points.isEmpty()) {
            return List.of();
        }
        GardenSpot[] spots = new GardenSpot[points.size()];
        jdbc.query("""
                WITH p AS (SELECT idx, ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS g
                             FROM unnest(CAST(:lats AS float8[]), CAST(:lons AS float8[]))
                                  WITH ORDINALITY AS u(lat, lon, idx)),
                     s AS (SELECT p.idx, inside.id AS inside_id,
                                  CASE WHEN inside.id IS NULL AND NOT EXISTS (
                                           SELECT 1 FROM green_elements e
                                            WHERE e.deleted_at IS NULL AND e.is_active
                                              AND (ST_DWithin(e.location::geography, p.g::geography, :specimen)
                                                   OR ST_Covers(e.area, p.g)))
                                       THEN near.id END AS near_id,
                                  (ST_MaximumInscribedCircle(COALESCE(inside.boundary, near.boundary))).center AS center
                             FROM p
                             LEFT JOIN LATERAL (%1$s AND ST_Covers(z.boundary, p.g)
                                   ORDER BY ST_Area(z.boundary), z.id LIMIT 1) inside ON TRUE
                             LEFT JOIN LATERAL (%1$s AND ST_DWithin(z.boundary::geography, p.g::geography, :nearest)
                                   ORDER BY ST_Distance(z.boundary::geography, p.g::geography), z.id LIMIT 1) near ON TRUE)
                SELECT idx, inside_id, near_id, ST_Y(center) AS lat, ST_X(center) AS lon FROM s
                """.formatted(SECTIONS), params(points)
                .addValue("specimen", SPECIMEN_METERS).addValue("nearest", NEAREST_GARDEN_METERS), rs -> {
            Long inside = rs.getObject("inside_id", Long.class);
            Long garden = inside != null ? inside : rs.getObject("near_id", Long.class);
            GeoPoint center = garden == null ? null : new GeoPoint(rs.getDouble("lat"), rs.getDouble("lon"));
            spots[rs.getInt("idx") - 1] = new GardenSpot(garden, inside != null, center);
        });
        return Arrays.asList(spots);
    }

    /** Cuáles de los puntos caen dentro del jardín y a {@code marginMeters} o más de su borde, en el mismo orden. */
    public List<Boolean> covered(long gardenId, List<GeoPoint> points, double marginMeters) {
        Boolean[] covered = new Boolean[points.size()];
        Arrays.fill(covered, Boolean.FALSE);
        jdbc.query("""
                SELECT u.idx, ST_Covers(z.boundary, u.g)
                              AND ST_Distance(ST_Boundary(z.boundary)::geography, u.g::geography) >= :margin AS covered
                  FROM zones z, (SELECT idx, ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS g
                                   FROM unnest(CAST(:lats AS float8[]), CAST(:lons AS float8[]))
                                        WITH ORDINALITY AS v(lat, lon, idx)) u
                 WHERE z.id = :garden
                """, params(points).addValue("garden", gardenId).addValue("margin", marginMeters), rs -> {
            covered[rs.getInt("idx") - 1] = rs.getBoolean("covered");
        });
        return Arrays.asList(covered);
    }

    private static MapSqlParameterSource params(List<GeoPoint> points) {
        return new MapSqlParameterSource()
                .addValue("lats", points.stream().map(GeoPoint::lat).toArray(Double[]::new))
                .addValue("lons", points.stream().map(GeoPoint::lon).toArray(Double[]::new));
    }
}
