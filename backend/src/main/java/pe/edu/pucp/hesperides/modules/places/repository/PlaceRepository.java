package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

/** Altas, cambios y bajas de lugares y sus alias. */
@Repository
@RequiredArgsConstructor
public class PlaceRepository {

    public record PlaceRow(long id, String code, String name, String kindCode, Long parentId, String parentName) {
    }

    /** Los ids ya resueltos; {@code geoJson} solo si el contorno se dibujó. */
    public record PlaceValues(String name, long kindItemId, long categoryItemId, Long parentId, Long buildingId,
            Long zoneId, Long featureId, String geoJson) {
    }

    private static final String SELECT_ROW = """
            SELECT p.id, p.code, p.name, k.code, p.parent_place_id, pp.name FROM places p
              JOIN catalog_items k ON k.id = p.kind_item_id
              LEFT JOIN places pp ON pp.id = p.parent_place_id
             WHERE p.deleted_at IS NULL AND\s""";

    private static final RowMapper<PlaceRow> ROW = (rs, i) -> new PlaceRow(rs.getLong(1), rs.getString(2),
            rs.getString(3), rs.getString(4), rs.getObject(5, Long.class), rs.getString(6));

    private static final String GEOMETRY = "CASE WHEN CAST(? AS TEXT) IS NULL THEN NULL "
            + "ELSE ST_SetSRID(ST_GeomFromGeoJSON(CAST(? AS TEXT)), 4326) END";

    private final JdbcTemplate jdbc;

    public PlaceRow byCode(String code) {
        return jdbc.query(SELECT_ROW + "p.code = ?", ROW, code).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Place not found: " + code));
    }

    public PlaceRow byId(long id) {
        return jdbc.query(SELECT_ROW + "p.id = ?", ROW, id).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Place not found: " + id));
    }

    public long insert(PlaceValues v) {
        return jdbc.queryForObject("""
                INSERT INTO places (name, kind_item_id, category_item_id, parent_place_id, building_id, zone_id,
                    feature_id, own_geometry) VALUES (?, ?, ?, ?, ?, ?, ?, %s) RETURNING id""".formatted(GEOMETRY),
                Long.class, v.name(), v.kindItemId(), v.categoryItemId(), v.parentId(), v.buildingId(), v.zoneId(),
                v.featureId(), v.geoJson(), v.geoJson());
    }

    public void update(long id, PlaceValues v) {
        jdbc.update("""
                UPDATE places SET name = ?, kind_item_id = ?, category_item_id = ?, parent_place_id = ?, building_id = ?,
                    zone_id = ?, feature_id = ?, own_geometry = %s, updated_at = CURRENT_TIMESTAMP WHERE id = ?"""
                .formatted(GEOMETRY), v.name(), v.kindItemId(), v.categoryItemId(), v.parentId(), v.buildingId(),
                v.zoneId(), v.featureId(), v.geoJson(), v.geoJson(), id);
    }

    /** Se va con sus perspectivas, fotos y alias: sin el lugar no ubican nada. */
    public void softDelete(long id) {
        for (String table : List.of("place_photos", "place_perspectives", "place_aliases")) {
            jdbc.update("UPDATE " + table + " SET deleted_at = CURRENT_TIMESTAMP WHERE place_id = ? AND deleted_at IS NULL", id);
        }
        jdbc.update("UPDATE places SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }

    public int activeChildren(long id) {
        return jdbc.queryForObject("SELECT count(*) FROM places WHERE parent_place_id = ? AND deleted_at IS NULL",
                Integer.class, id);
    }

    public void replaceAliases(long placeId, List<String> aliases) {
        jdbc.update("UPDATE place_aliases SET deleted_at = CURRENT_TIMESTAMP WHERE place_id = ? AND deleted_at IS NULL",
                placeId);
        aliases.stream().map(String::strip).distinct().forEach(alias ->
                jdbc.update("INSERT INTO place_aliases (place_id, alias) VALUES (?, ?)", placeId, alias));
    }
}
