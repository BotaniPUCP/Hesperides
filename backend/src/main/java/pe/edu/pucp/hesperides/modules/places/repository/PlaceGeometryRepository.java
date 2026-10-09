package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.places.LandmarkCandidate;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

/** Lo que PostGIS calcula para nombrar perspectivas: centros, distancias y vecinos. */
@Repository
@RequiredArgsConstructor
public class PlaceGeometryRepository {

    public record LatLon(double lat, double lon) {
    }

    private static final String POINT = "ST_SetSRID(ST_MakePoint(?, ?), 4326)";

    private final JdbcTemplate jdbc;

    public LatLon center(long placeId) {
        return jdbc.query("""
                SELECT ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)) FROM place_outlines
                 WHERE place_id = ? AND geom IS NOT NULL""", (rs, i) -> new LatLon(rs.getDouble(1), rs.getDouble(2)), placeId)
                .stream().findFirst()
                .orElseThrow(() -> new BusinessRuleException("The place has no outline to locate its perspectives"));
    }

    /** Lugares exteriores vigentes cuyo contorno está a {@code radiusM} o menos del punto. */
    public List<LandmarkCandidate> landmarkCandidates(double lat, double lon, double radiusM) {
        return jdbc.query("""
                SELECT p.id, p.name, ST_Distance(o.geom::geography, %1$s::geography) FROM place_outlines o
                  JOIN places p ON p.id = o.place_id
                  JOIN catalog_items k ON k.id = p.kind_item_id AND k.code = 'OUTDOOR'
                 WHERE o.geom IS NOT NULL AND ST_DWithin(o.geom::geography, %1$s::geography, ?)""".formatted(POINT),
                (rs, i) -> new LandmarkCandidate(rs.getLong(1), rs.getString(2), rs.getDouble(3)),
                lon, lat, lon, lat, radiusM);
    }

    /**
     * Las perspectivas cuyo nombre puede cambiar si este lugar cambia: las suyas,
     * las de sus hijos (llevan su nombre de padre), las que lo tienen de hito y
     * las que podrían ganarlo por estar cerca.
     */
    public List<Long> perspectivesAffectedBy(long placeId, double radiusM) {
        return jdbc.queryForList("""
                SELECT v.id FROM place_perspectives v JOIN places p ON p.id = v.place_id
                 WHERE v.deleted_at IS NULL AND p.deleted_at IS NULL
                   AND (v.place_id = ? OR p.parent_place_id = ? OR v.landmark_place_id = ?
                        OR EXISTS (SELECT 1 FROM place_outlines o WHERE o.place_id = ? AND o.geom IS NOT NULL
                                    AND ST_DWithin(o.geom::geography, v.location::geography, ?)))""",
                Long.class, placeId, placeId, placeId, placeId, radiusM);
    }
}
