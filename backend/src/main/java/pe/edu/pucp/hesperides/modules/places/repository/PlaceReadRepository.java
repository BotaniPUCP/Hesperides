package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

/** Lecturas del catálogo: tarjetas, y las partes de una ficha que no son perspectivas ni fotos. */
@Repository
@RequiredArgsConstructor
public class PlaceReadRepository {

    public record SummaryRow(String code, String name, String parentCode, String parentName, String kindCode,
            String kindLabel, String categoryCode, String categoryLabel, Long mainPhotoId, int perspectives,
            boolean hasFront, boolean hasBack) {
    }

    public record CategoryRow(String kindCode, String kindLabel, String categoryCode, String categoryLabel) {
    }

    public record OutlineRow(Long buildingId, String zoneCode, String featureCode, boolean drawn, Double lat, Double lon) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    /** Busca sin tildes ni mayúsculas en el nombre, los alias y los nombres de perspectiva. */
    public List<SummaryRow> list(String search, String categoryCode, String kindCode) {
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("search", LikePattern.contains(search))
                .addValue("category", categoryCode).addValue("kind", kindCode);
        return jdbc.query(PlaceQueries.LIST, params, (rs, i) -> new SummaryRow(rs.getString("code"), rs.getString("name"),
                rs.getString("parent_code"), rs.getString("parent_name"), rs.getString("kind_code"),
                rs.getString("kind_label"), rs.getString("category_code"), rs.getString("category_label"),
                rs.getObject("main_photo_id", Long.class), rs.getInt("perspectives"), rs.getBoolean("has_front"),
                rs.getBoolean("has_back")));
    }

    public CategoryRow kindAndCategory(long placeId) {
        return jdbc.queryForObject("""
                SELECT k.code, k.label, c.code, c.label FROM places p JOIN catalog_items k ON k.id = p.kind_item_id
                  JOIN catalog_items c ON c.id = p.category_item_id WHERE p.id = :id""", new MapSqlParameterSource("id", placeId),
                (rs, i) -> new CategoryRow(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)));
    }

    public OutlineRow outline(long placeId) {
        return jdbc.queryForObject(PlaceQueries.OUTLINE, new MapSqlParameterSource("id", placeId),
                (rs, i) -> new OutlineRow(rs.getObject(1, Long.class), rs.getString(2), rs.getString(3), rs.getBoolean(4),
                        rs.getObject(5, Double.class), rs.getObject(6, Double.class)));
    }

    public List<String> aliases(long placeId) {
        return jdbc.queryForList("SELECT alias FROM place_aliases WHERE place_id = :id AND deleted_at IS NULL ORDER BY alias",
                new MapSqlParameterSource("id", placeId), String.class);
    }

    public List<String[]> children(long placeId) {
        return jdbc.query("SELECT code, name FROM places WHERE parent_place_id = :id AND deleted_at IS NULL ORDER BY name",
                new MapSqlParameterSource("id", placeId), (rs, i) -> new String[] {rs.getString(1), rs.getString(2)});
    }
}
