package pe.edu.pucp.hesperides.modules.places.repository;

/** SQL largo del catálogo, fuera de los repositorios para que se lean. */
final class PlaceQueries {

    /**
     * Una tarjeta por lugar. La foto principal es la primera sin perspectiva ni
     * vista interior; la búsqueda mira nombre, alias y perspectivas.
     */
    static final String LIST = """
            SELECT p.code, p.name, pp.code AS parent_code, pp.name AS parent_name, k.code AS kind_code,
                   k.label AS kind_label, c.code AS category_code, c.label AS category_label,
                   (SELECT f.id FROM place_photos f WHERE f.place_id = p.id AND f.deleted_at IS NULL
                       AND f.perspective_id IS NULL AND f.interior_view_item_id IS NULL ORDER BY f.sort_order LIMIT 1)
                       AS main_photo_id,
                   (SELECT count(*) FROM place_perspectives v WHERE v.place_id = p.id AND v.deleted_at IS NULL)
                       AS perspectives,
                   EXISTS (SELECT 1 FROM place_perspectives v JOIN catalog_items s ON s.id = v.side_item_id
                            WHERE v.place_id = p.id AND v.deleted_at IS NULL AND s.code = 'FRONT') AS has_front,
                   EXISTS (SELECT 1 FROM place_perspectives v JOIN catalog_items s ON s.id = v.side_item_id
                            WHERE v.place_id = p.id AND v.deleted_at IS NULL AND s.code = 'BACK') AS has_back
              FROM places p
              JOIN catalog_items k ON k.id = p.kind_item_id
              JOIN catalog_items c ON c.id = p.category_item_id
              LEFT JOIN places pp ON pp.id = p.parent_place_id AND pp.deleted_at IS NULL
             WHERE p.deleted_at IS NULL
               AND (CAST(:category AS TEXT) IS NULL OR c.code = :category)
               AND (CAST(:kind AS TEXT) IS NULL OR k.code = :kind)
               AND (CAST(:search AS TEXT) IS NULL OR unaccent(lower(concat_ws(' ', p.code, p.name, pp.name,
                    (SELECT string_agg(a.alias, ' ') FROM place_aliases a WHERE a.place_id = p.id AND a.deleted_at IS NULL),
                    (SELECT string_agg(v.display_name, ' ') FROM place_perspectives v
                      WHERE v.place_id = p.id AND v.deleted_at IS NULL)))) LIKE unaccent(lower(:search)))
             ORDER BY lower(p.name), lower(pp.name) NULLS FIRST""";

    static final String OUTLINE = """
            SELECT p.building_id, z.code, f.code, p.own_geometry IS NOT NULL,
                   ST_Y(ST_Centroid(o.geom)), ST_X(ST_Centroid(o.geom))
              FROM places p
              LEFT JOIN zones z ON z.id = p.zone_id
              LEFT JOIN campus_features f ON f.id = p.feature_id
              LEFT JOIN place_outlines o ON o.place_id = p.id
             WHERE p.id = :id""";

    private PlaceQueries() {
    }
}
