package pe.edu.pucp.hesperides.modules.places.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.GeoPoint;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.MapView;

/** El catálogo resumido para el mapa: dónde está cada lugar y cada perspectiva, sin fichas completas. */
@Repository
@RequiredArgsConstructor
public class PlaceMapRepository {

    /** Un interior no tiene centro propio: toma el de su padre. */
    public record MapPlaceRow(String code, String name, String parentName, List<Long> buildingIds, Double lat, Double lon) {
    }

    public record MapPerspectiveRow(long id, String placeCode, String placeName, String displayName, double lat,
            double lon, double headingDeg, Long firstPhotoId, MapView mapView) {
    }

    private final JdbcTemplate jdbc;

    public List<MapPlaceRow> places() {
        return jdbc.query("""
                SELECT p.code, p.name, pp.name, %s,
                       ST_Y(ST_Centroid(COALESCE(o.geom, po.geom))), ST_X(ST_Centroid(COALESCE(o.geom, po.geom)))
                  FROM places p
                  LEFT JOIN places pp ON pp.id = p.parent_place_id AND pp.deleted_at IS NULL
                  LEFT JOIN place_outlines o ON o.place_id = p.id
                  LEFT JOIN place_outlines po ON po.place_id = p.parent_place_id
                 WHERE p.deleted_at IS NULL ORDER BY p.code""".formatted(PlaceQueries.BUILDING_IDS),
                (rs, i) -> new MapPlaceRow(rs.getString(1), rs.getString(2), rs.getString(3), SqlArrays.longs(rs.getArray(4)),
                        rs.getObject(5, Double.class), rs.getObject(6, Double.class)));
    }

    public List<MapPerspectiveRow> perspectives() {
        return jdbc.query("""
                SELECT v.id, p.code, p.name, v.display_name, ST_Y(v.location), ST_X(v.location), v.heading_deg,
                       (SELECT f.id FROM place_photos f WHERE f.perspective_id = v.id AND f.deleted_at IS NULL
                         ORDER BY f.sort_order LIMIT 1),
                       v.view_camera_lat, v.view_camera_lon, v.view_camera_height_m,
                       v.view_target_lat, v.view_target_lon, v.view_target_height_m
                  FROM place_perspectives v JOIN places p ON p.id = v.place_id
                 WHERE v.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY p.code, v.sort_order""",
                (rs, i) -> new MapPerspectiveRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getDouble(5), rs.getDouble(6), rs.getDouble(7), rs.getObject(8, Long.class), mapView(rs)));
    }

    private static MapView mapView(ResultSet rs) throws SQLException {
        Double cameraLat = rs.getObject(9, Double.class);
        if (cameraLat == null) {
            return null;
        }
        return new MapView(new GeoPoint(cameraLat, rs.getDouble(10), rs.getDouble(11)),
                new GeoPoint(rs.getDouble(12), rs.getDouble(13), rs.getDouble(14)));
    }
}
