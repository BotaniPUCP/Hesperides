package pe.edu.pucp.hesperides.modules.places.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.GeoPoint;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.MapView;

/** La vista guardada de cada lugar (V021). */
@Repository
@RequiredArgsConstructor
public class PlaceMapViewRepository {

    private final JdbcTemplate jdbc;

    /** @return la vista guardada, o null si el lugar usa el encuadre automático */
    public MapView find(long placeId) {
        return jdbc.query("""
                SELECT view_camera_lat, view_camera_lon, view_camera_height_m, view_target_lat, view_target_lon,
                       view_target_height_m FROM places WHERE id = ? AND view_camera_lat IS NOT NULL""",
                (rs, i) -> new MapView(new GeoPoint(rs.getDouble(1), rs.getDouble(2), rs.getDouble(3)),
                        new GeoPoint(rs.getDouble(4), rs.getDouble(5), rs.getDouble(6))), placeId)
                .stream().findFirst().orElse(null);
    }

    /** {@code view} null vuelve al encuadre automático. */
    public void save(long placeId, MapView view) {
        GeoPoint c = view == null ? null : view.camera();
        GeoPoint t = view == null ? null : view.target();
        jdbc.update("""
                UPDATE places SET view_camera_lat = ?, view_camera_lon = ?, view_camera_height_m = ?, view_target_lat = ?,
                       view_target_lon = ?, view_target_height_m = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                c == null ? null : c.lat(), c == null ? null : c.lon(), c == null ? null : c.heightM(),
                t == null ? null : t.lat(), t == null ? null : t.lon(), t == null ? null : t.heightM(), placeId);
    }
}
