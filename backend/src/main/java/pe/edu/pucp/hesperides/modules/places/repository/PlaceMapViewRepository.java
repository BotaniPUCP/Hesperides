package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.GeoPoint;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.MapView;

/** La vista guardada de un lugar (V021) o de una perspectiva (V022): mismas columnas en las dos tablas. */
@Repository
@RequiredArgsConstructor
public class PlaceMapViewRepository {

    /** Lista cerrada: el nombre de la tabla va al SQL. */
    public enum Owner {
        PLACE("places"),
        PERSPECTIVE("place_perspectives");

        private final String table;

        Owner(String table) {
            this.table = table;
        }
    }

    private static final String COLUMNS = "view_camera_lat, view_camera_lon, view_camera_height_m, view_target_lat, "
            + "view_target_lon, view_target_height_m";

    private static final RowMapper<MapView> VIEW = (rs, i) -> new MapView(
            new GeoPoint(rs.getDouble("view_camera_lat"), rs.getDouble("view_camera_lon"), rs.getDouble("view_camera_height_m")),
            new GeoPoint(rs.getDouble("view_target_lat"), rs.getDouble("view_target_lon"), rs.getDouble("view_target_height_m")));

    private final JdbcTemplate jdbc;

    /** @return la vista guardada, o null si usa la vista por defecto */
    public MapView find(Owner owner, long id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM " + owner.table + " WHERE id = ? AND view_camera_lat IS NOT NULL",
                VIEW, id).stream().findFirst().orElse(null);
    }

    /** Las vistas de las perspectivas de un lugar, por id; las que no tienen no aparecen. */
    public Map<Long, MapView> perspectivesOf(long placeId) {
        Map<Long, MapView> views = new HashMap<>();
        jdbc.query("SELECT id, " + COLUMNS + " FROM place_perspectives WHERE place_id = ? AND deleted_at IS NULL"
                + " AND view_camera_lat IS NOT NULL", rs -> {
                    views.put(rs.getLong("id"), VIEW.mapRow(rs, 0));
                }, placeId);
        return views;
    }

    /** {@code view} null vuelve a la vista por defecto. */
    public void save(Owner owner, long id, MapView view) {
        GeoPoint c = view == null ? null : view.camera();
        GeoPoint t = view == null ? null : view.target();
        jdbc.update("UPDATE " + owner.table + " SET view_camera_lat = ?, view_camera_lon = ?, view_camera_height_m = ?, "
                + "view_target_lat = ?, view_target_lon = ?, view_target_height_m = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                c == null ? null : c.lat(), c == null ? null : c.lon(), c == null ? null : c.heightM(),
                t == null ? null : t.lat(), t == null ? null : t.lon(), t == null ? null : t.heightM(), id);
    }
}
