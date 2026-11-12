package pe.edu.pucp.hesperides.modules.places.repository;

import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class PlaceWorkbookExportRepository {

    public record ExportPlace(long id, String code, String name, String kindCode, String categoryCode,
            String parentCode, String aliases, String buildingIds, String zoneCode, String featureCode,
            Double pointLat, Double pointLon, boolean fromChildren) {
    }

    public record ExportPerspective(long placeId, String sideCode, double lat, double lon, double headingDeg,
            String photoKey, String photoContentType) {
    }

    private static final String BUILDING_IDS = """
            array_to_string(
                COALESCE(
                    NULLIF(ARRAY(SELECT pb.building_id FROM place_buildings pb
                                  WHERE pb.place_id = p.id AND pb.deleted_at IS NULL ORDER BY pb.building_id),
                           '{}'::bigint[]),
                    CASE WHEN p.building_id IS NULL THEN '{}'::bigint[] ELSE ARRAY[p.building_id] END
                ), ';')
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<ExportPlace> findPlaces(String categoryCode, String alias, String parentCode, LocalDate createdFrom,
            LocalDate createdTo, String triangleWkt) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("category", categoryCode)
                .addValue("alias", alias)
                .addValue("parent", parentCode)
                .addValue("createdFrom", createdFrom)
                .addValue("createdTo", createdTo)
                .addValue("triangleWkt", triangleWkt);
        return jdbc.query("""
                WITH RECURSIVE location_candidates AS (
                    SELECT p.id AS place_id, p.parent_place_id AS parent_id, o.geom, 0 AS depth
                      FROM places p
                      LEFT JOIN place_outlines o ON o.place_id = p.id
                     WHERE p.deleted_at IS NULL
                    UNION ALL
                    SELECT candidate.place_id, ancestor.parent_place_id, parent_outline.geom, candidate.depth + 1
                      FROM location_candidates candidate
                      JOIN places ancestor ON ancestor.id = candidate.parent_id AND ancestor.deleted_at IS NULL
                      LEFT JOIN place_outlines parent_outline ON parent_outline.place_id = ancestor.id
                     WHERE candidate.geom IS NULL AND candidate.depth < 3
                ),
                effective_locations AS (
                    SELECT DISTINCT ON (place_id) place_id, geom
                      FROM location_candidates
                     WHERE geom IS NOT NULL
                     ORDER BY place_id, depth
                )
                SELECT p.id, p.code, p.name, kind.code, category.code, parent.code,
                       (SELECT string_agg(a.alias, ';' ORDER BY a.alias)
                          FROM place_aliases a WHERE a.place_id = p.id AND a.deleted_at IS NULL),
                       CASE WHEN kind.code = 'OUTDOOR' THEN NULL ELSE %s END,
                       CASE WHEN kind.code = 'OUTDOOR' THEN NULL ELSE zone.code END,
                       CASE WHEN kind.code = 'OUTDOOR' THEN NULL ELSE feature.code END,
                       CASE WHEN kind.code = 'OUTDOOR' THEN ST_Y(ST_Centroid(location.geom)) END,
                       CASE WHEN kind.code = 'OUTDOOR' THEN ST_X(ST_Centroid(location.geom)) END,
                       CASE WHEN kind.code = 'OUTDOOR' THEN FALSE ELSE p.outline_from_children END
                  FROM places p
                  JOIN catalog_items kind ON kind.id = p.kind_item_id
                  JOIN catalog_items category ON category.id = p.category_item_id
                  LEFT JOIN places parent ON parent.id = p.parent_place_id AND parent.deleted_at IS NULL
                  LEFT JOIN zones zone ON zone.id = p.zone_id
                  LEFT JOIN campus_features feature ON feature.id = p.feature_id
                  LEFT JOIN effective_locations location ON location.place_id = p.id
                 WHERE p.deleted_at IS NULL
                   AND (CAST(:category AS TEXT) IS NULL OR category.code = :category)
                   AND (CAST(:parent AS TEXT) IS NULL OR parent.code = :parent)
                   AND (CAST(:alias AS TEXT) IS NULL OR EXISTS (
                       SELECT 1 FROM place_aliases a
                        WHERE a.place_id = p.id AND a.deleted_at IS NULL
                          AND unaccent(lower(a.alias)) = unaccent(lower(:alias))))
                   AND (CAST(:createdFrom AS DATE) IS NULL OR p.created_at >= CAST(:createdFrom AS DATE))
                   AND (CAST(:createdTo AS DATE) IS NULL OR p.created_at < CAST(:createdTo AS DATE) + INTERVAL '1 day')
                   AND (CAST(:triangleWkt AS TEXT) IS NULL OR (
                       location.geom IS NOT NULL
                       AND ST_Covers(ST_SetSRID(ST_GeomFromText(:triangleWkt), 4326),
                                     ST_PointOnSurface(location.geom))))
                 ORDER BY lower(p.name), lower(parent.name) NULLS FIRST
                """.formatted(BUILDING_IDS), parameters, (rs, row) -> new ExportPlace(
                        rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9), rs.getString(10),
                        rs.getObject(11, Double.class), rs.getObject(12, Double.class), rs.getBoolean(13)));
    }

    public List<ExportPerspective> findPerspectives(List<Long> placeIds, List<String> sides) {
        if (placeIds.isEmpty() || sides.isEmpty()) return List.of();
        return jdbc.query("""
                SELECT v.place_id, side.code, ST_Y(v.location), ST_X(v.location), v.heading_deg,
                       photo.storage_key, photo.content_type
                  FROM place_perspectives v
                  JOIN catalog_items side ON side.id = v.side_item_id
                  LEFT JOIN LATERAL (
                      SELECT f.storage_key, f.content_type FROM place_photos f
                       WHERE f.perspective_id = v.id AND f.deleted_at IS NULL
                       ORDER BY f.sort_order LIMIT 1
                  ) photo ON TRUE
                 WHERE v.deleted_at IS NULL AND v.place_id IN (:placeIds) AND side.code IN (:sides)
                 ORDER BY v.place_id, v.sort_order, v.id
                """, new MapSqlParameterSource().addValue("placeIds", placeIds).addValue("sides", sides),
                (rs, row) -> new ExportPerspective(rs.getLong(1), rs.getString(2), rs.getDouble(3),
                        rs.getDouble(4), rs.getDouble(5), rs.getString(6), rs.getString(7)));
    }
}
