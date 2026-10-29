package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

/** Perspectivas de un lugar: el punto, la dirección y el nombre que les puso el sistema. */
@Repository
@RequiredArgsConstructor
public class PerspectiveRepository {

    /** Lo que el Engine necesita para nombrarla. */
    public record ForNaming(long id, long placeId, String placeName, String parentName, String sideCode, double lat,
            double lon) {
    }

    public record PerspectiveRow(long id, long placeId, String sideCode, String sideLabel, String displayName,
            String compass, String landmarkCode, String landmarkName, double lat, double lon, double headingDeg) {
    }

    private static final String POINT = "ST_SetSRID(ST_MakePoint(?, ?), 4326)";

    private static final RowMapper<PerspectiveRow> ROW = (rs, i) -> new PerspectiveRow(rs.getLong(1), rs.getLong(2),
            rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8),
            rs.getDouble(9), rs.getDouble(10), rs.getDouble(11));

    private static final String SELECT_ROW = """
            SELECT v.id, v.place_id, s.code, s.label, v.display_name, v.compass, l.code, l.name,
                   ST_Y(v.location), ST_X(v.location), v.heading_deg FROM place_perspectives v
              JOIN catalog_items s ON s.id = v.side_item_id
              LEFT JOIN places l ON l.id = v.landmark_place_id AND l.deleted_at IS NULL
             WHERE v.deleted_at IS NULL AND\s""";

    private final JdbcTemplate jdbc;

    /** El nombre definitivo lo escribe {@link #saveNaming} en la misma transacción. */
    public long insert(long placeId, long sideItemId, double lat, double lon, double headingDeg) {
        return jdbc.queryForObject("""
                INSERT INTO place_perspectives (place_id, side_item_id, location, heading_deg, display_name, sort_order)
                VALUES (?, ?, %s, ?, '', (SELECT COALESCE(max(sort_order), 0) + 1 FROM place_perspectives
                                           WHERE place_id = ? AND deleted_at IS NULL)) RETURNING id""".formatted(POINT),
                Long.class, placeId, sideItemId, lon, lat, headingDeg, placeId);
    }

    public void move(long id, long sideItemId, double lat, double lon, double headingDeg) {
        jdbc.update("UPDATE place_perspectives SET side_item_id = ?, location = %s, heading_deg = ?, "
                .formatted(POINT) + "updated_at = CURRENT_TIMESTAMP WHERE id = ?", sideItemId, lon, lat, headingDeg, id);
    }

    public void saveNaming(long id, String compass, Long landmarkPlaceId, String displayName) {
        jdbc.update("UPDATE place_perspectives SET compass = ?, landmark_place_id = ?, display_name = ? WHERE id = ?",
                compass, landmarkPlaceId, displayName, id);
    }

    /** Las referencias enlazadas a ella quedan enlazadas al lugar, sin perspectiva. */
    public void softDelete(long id) {
        jdbc.update("UPDATE place_reference_links SET perspective_id = NULL WHERE perspective_id = ?", id);
        jdbc.update("UPDATE place_photos SET deleted_at = CURRENT_TIMESTAMP WHERE perspective_id = ? AND deleted_at IS NULL", id);
        jdbc.update("UPDATE place_perspectives SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }

    /** Cuántas perspectivas vigentes de ese lado tiene el lugar, sin contar {@code exceptId}. */
    public int countSide(long placeId, long sideItemId, long exceptId) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM place_perspectives WHERE place_id = ? AND side_item_id = ? AND id <> ?
                   AND deleted_at IS NULL""", Integer.class, placeId, sideItemId, exceptId);
    }

    public ForNaming forNaming(long id) {
        return jdbc.query("""
                SELECT v.id, v.place_id, p.name, pp.name, s.code, ST_Y(v.location), ST_X(v.location)
                  FROM place_perspectives v JOIN places p ON p.id = v.place_id
                  LEFT JOIN places pp ON pp.id = p.parent_place_id AND pp.deleted_at IS NULL
                  JOIN catalog_items s ON s.id = v.side_item_id WHERE v.id = ?""",
                (rs, i) -> new ForNaming(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getDouble(6), rs.getDouble(7)), id).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Perspective not found: " + id));
    }

    public PerspectiveRow byId(long placeId, long id) {
        return jdbc.query(SELECT_ROW + "v.place_id = ? AND v.id = ?", ROW, placeId, id).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Perspective not found: " + id));
    }

    public List<PerspectiveRow> byPlace(long placeId) {
        return jdbc.query(SELECT_ROW + "v.place_id = ? ORDER BY v.sort_order, v.id", ROW, placeId);
    }

    /** Las vigentes a {@code radiusM} o menos del punto, de la más cercana a la más lejana. */
    public List<PerspectiveRow> near(double lat, double lon, double radiusM) {
        return jdbc.query(SELECT_ROW + "ST_DWithin(v.location::geography, %1$s::geography, ?) ".formatted(POINT)
                + "ORDER BY ST_Distance(v.location::geography, %1$s::geography)".formatted(POINT), ROW,
                lon, lat, radiusM, lon, lat);
    }
}
