package pe.edu.pucp.hesperides.modules.map.repository;

/**
 * SQL de las capas del mapa. Cada consulta devuelve una FeatureCollection GeoJSON
 * ya armada por PostGIS: el backend no materializa geometrías en Java para
 * después volver a serializarlas.
 *
 * Siete decimales en las coordenadas son ~1 cm: más precisión solo engorda la
 * respuesta que el visor descarga.
 */
final class MapLayerQueries {

    private static final String COLLECTION_OPEN =
            "SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(";
    private static final String COLLECTION_CLOSE = "), '[]'::json))::text ";

    private static String feature(String geometry, String properties, String orderBy) {
        return "json_build_object('type', 'Feature', 'geometry', ST_AsGeoJSON(" + geometry + ", 7)::json, "
                + "'properties', json_build_object(" + properties + ")) ORDER BY " + orderBy;
    }

    /** Sectores, secciones o subsecciones según el código de ZONE_TYPE del parámetro. */
    static final String ZONES = COLLECTION_OPEN
            + feature("z.boundary", "'code', z.code, 'name', z.name, 'description', z.description, "
                    + "'parentCode', p.code, 'mapCode', z.map_code, 'useType', u.label, "
                    + "'reservable', z.is_reservable, 'reservationOwner', o.label, 'areaM2', z.area_m2", "z.code")
            + COLLECTION_CLOSE
            + "FROM zones z "
            + "JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = ? "
            + "LEFT JOIN zones p ON p.id = z.parent_zone_id "
            + "LEFT JOIN catalog_items u ON u.id = z.use_type_item_id "
            + "LEFT JOIN catalog_items o ON o.id = z.reservation_owner_item_id "
            + "WHERE z.deleted_at IS NULL AND z.is_active AND z.boundary IS NOT NULL";

    static final String SUPERVISION_ZONES = COLLECTION_OPEN
            + feature("s.boundary", "'code', s.code, 'name', s.name, "
                    + "'supervisor', u.first_name || ' ' || u.last_name, 'areaM2', s.area_m2", "s.code")
            + COLLECTION_CLOSE
            + "FROM supervision_zones s JOIN users u ON u.id = s.supervisor_user_id "
            + "WHERE s.deleted_at IS NULL AND s.is_active";

    static final String REFERENCES = COLLECTION_OPEN
            + feature("r.location", "'code', r.code, 'name', r.name, 'category', c.label, "
                    + "'parentCode', p.code, 'aliases', (SELECT json_agg(a.alias ORDER BY a.alias) "
                    + "FROM place_reference_aliases a WHERE a.reference_id = r.id AND a.deleted_at IS NULL)", "r.code")
            + COLLECTION_CLOSE
            + "FROM place_references r JOIN catalog_items c ON c.id = r.category_item_id "
            + "LEFT JOIN place_references p ON p.id = r.parent_reference_id "
            + "WHERE r.deleted_at IS NULL AND r.is_active";

    static final String BUILDINGS = COLLECTION_OPEN
            + feature("b.footprint", "'id', b.id, 'name', b.name, 'inferredName', b.is_inferred_name, "
                    + "'category', c.label, 'campus', b.is_campus, 'heightM', b.height_m, 'levels', b.levels, "
                    + "'source', b.source, 'aliases', (SELECT json_agg(a.alias ORDER BY a.alias) "
                    + "FROM campus_building_aliases a WHERE a.building_id = b.id AND a.deleted_at IS NULL)", "b.id")
            + COLLECTION_CLOSE
            + "FROM campus_buildings b LEFT JOIN catalog_items c ON c.id = b.category_item_id "
            + "WHERE b.deleted_at IS NULL AND b.is_active";

    static final String FEATURES = COLLECTION_OPEN
            + feature("f.geom", "'code', f.code, 'type', t.code, 'typeLabel', t.label, 'name', f.name, "
                    + "'attributes', f.attributes", "f.id")
            + COLLECTION_CLOSE
            + "FROM campus_features f JOIN catalog_items t ON t.id = f.feature_type_item_id "
            + "WHERE f.deleted_at IS NULL AND f.is_active";

    static final String VERSION = "SELECT version FROM map_data_version WHERE id = 1";

    static final String ATTRIBUTION_REQUIRED =
            "SELECT EXISTS (SELECT 1 FROM campus_buildings WHERE source = 'OSM' AND deleted_at IS NULL)";

    /** Origen del plano local: el centroide del límite del campus. */
    static final String ORIGIN = "SELECT ST_Y(c) AS lat, ST_X(c) AS lon FROM ("
            + "SELECT ST_Centroid(f.geom) AS c FROM campus_features f "
            + "JOIN catalog_items t ON t.id = f.feature_type_item_id AND t.code = 'CAMPUS_BOUNDARY' "
            + "WHERE f.deleted_at IS NULL LIMIT 1) AS s";

    private MapLayerQueries() {
    }
}
