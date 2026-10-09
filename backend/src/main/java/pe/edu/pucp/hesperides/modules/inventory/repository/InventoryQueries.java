package pe.edu.pucp.hesperides.modules.inventory.repository;

import java.util.List;
import java.util.Map;

/**
 * SQL del inventario verde. Los textos de búsqueda llegan como parámetro y se
 * comparan sin tildes ni mayúsculas (unaccent), como escribe el personal.
 */
final class InventoryQueries {

    private InventoryQueries() {
    }

    private static final String ACTIVE_ELEMENT = "e.deleted_at IS NULL AND e.is_active";

    static final String SPECIES_COLUMNS = """
            SELECT s.slug, s.scientific_name, s.common_name, s.family, t.code AS type_code, t.label AS type_label,
                   (SELECT count(*) FROM green_elements e WHERE e.species_id = s.id AND %1$s) AS specimen_count,
                   (SELECT e.photo_url FROM green_elements e WHERE e.species_id = s.id AND %1$s AND e.photo_url IS NOT NULL
                     ORDER BY e.data_source = 'MEASURED' DESC, e.code LIMIT 1) AS photo_url,
                   (SELECT string_agg(n.name, '|' ORDER BY n.name) FROM species_common_names n
                     WHERE n.species_id = s.id AND n.deleted_at IS NULL) AS other_names,
                   (SELECT sp.id FROM species_photos sp WHERE sp.species_id = s.id AND sp.deleted_at IS NULL
                     ORDER BY sp.sort_order LIMIT 1) AS species_photo_id,
                   (SELECT a.id FROM green_element_attachments a JOIN green_elements e ON e.id = a.green_element_id
                     WHERE e.species_id = s.id AND %1$s AND a.deleted_at IS NULL
                     ORDER BY e.data_source = 'MEASURED' DESC, e.code, a.id DESC LIMIT 1) AS specimen_photo_id
              FROM species s JOIN catalog_items t ON t.id = s.species_type_item_id
            """.formatted(ACTIVE_ELEMENT);

    static final String SPECIES_FILTER = """
             WHERE s.deleted_at IS NULL AND s.is_active
               AND (CAST(:type AS TEXT) IS NULL OR t.code = :type)
               AND (CAST(:search AS TEXT) IS NULL OR unaccent(lower(concat_ws(' ', s.scientific_name, s.common_name,
                    s.family, (SELECT string_agg(n.name, ' ') FROM species_common_names n
                               WHERE n.species_id = s.id AND n.deleted_at IS NULL)))) LIKE unaccent(lower(:search)))
            """;

    /** Primero las especies con más ejemplares: son las que más se buscan. */
    static final String SPECIES_PAGE = "SELECT * FROM (" + SPECIES_COLUMNS + SPECIES_FILTER + ") x"
            + " ORDER BY specimen_count DESC, common_name LIMIT :limit OFFSET :offset";

    static final String SPECIES_COUNT = "SELECT count(*) FROM species s JOIN catalog_items t"
            + " ON t.id = s.species_type_item_id" + SPECIES_FILTER;

    static final String SPECIES_BY_SLUG = SPECIES_COLUMNS + " WHERE s.slug = :slug AND s.deleted_at IS NULL";

    static final String TOTALS = """
            SELECT (SELECT count(*) FROM species WHERE deleted_at IS NULL AND is_active) AS species,
                   (SELECT count(*) FROM green_elements e WHERE %s) AS specimens
            """.formatted(ACTIVE_ELEMENT);

    static final String TYPE_COUNTS = """
            SELECT t.code, t.label, count(e.id) AS total
              FROM catalog_items t JOIN catalog_types ct ON ct.id = t.catalog_type_id AND ct.code = 'SPECIES_TYPE'
              LEFT JOIN species s ON s.species_type_item_id = t.id AND s.deleted_at IS NULL
              LEFT JOIN green_elements e ON e.species_id = s.id AND %s
             WHERE t.is_active
             GROUP BY t.code, t.label, t.sort_order ORDER BY t.sort_order
            """.formatted(ACTIVE_ELEMENT);

    static final String SPECIMEN_COLUMNS = """
            SELECT e.code, e.source_reference, e.source_location, e.legacy_code, ST_Y(e.location) AS lat,
                   ST_X(e.location) AS lon, e.photo_url, e.quantity, e.notes, e.height_m, e.trunk_height_m, e.dbh_cm,
                   e.crown_radius_m, e.is_banded, e.data_source, et.code AS element_type_code,
                   et.label AS element_type_label, s.slug,
                   (SELECT a.id FROM green_element_attachments a WHERE a.green_element_id = e.id AND a.deleted_at IS NULL
                     ORDER BY a.id DESC LIMIT 1) AS attachment_id
              FROM green_elements e
              JOIN species s ON s.id = e.species_id
              JOIN catalog_items et ON et.id = e.element_type_item_id
            """;

    static final String SPECIMEN_FILTER = """
             WHERE s.slug = :slug AND %s
               AND (CAST(:location AS TEXT) IS NULL OR e.source_location = :location)
               AND (CAST(:search AS TEXT) IS NULL OR unaccent(lower(concat_ws(' ', e.code, e.source_reference,
                    e.source_location, e.legacy_code, e.notes))) LIKE unaccent(lower(:search)))
            """.formatted(ACTIVE_ELEMENT);

    /**
     * Columnas de orden por clave de la API. «reference» ordena p2 antes que p10:
     * primero el prefijo de letras, después el número.
     */
    static final Map<String, List<String>> SPECIMEN_ORDER = Map.of(
            "code", List.of("e.code"),
            "location", List.of("e.source_location"),
            "reference", List.of("lower(substring(e.source_reference FROM '^\\D*'))",
                    "CAST(NULLIF(substring(e.source_reference FROM '\\d+'), '') AS BIGINT)"));

    static final String SPECIMEN_COUNT = "SELECT count(*) FROM green_elements e JOIN species s ON s.id = e.species_id"
            + SPECIMEN_FILTER;

    static final String SPECIMEN_BY_CODE = SPECIMEN_COLUMNS + " WHERE e.code = :code AND " + ACTIVE_ELEMENT;

    static final String LOCATIONS = """
            SELECT e.source_location AS location, count(*) AS total
              FROM green_elements e JOIN species s ON s.id = e.species_id
             WHERE s.slug = :slug AND %s AND e.source_location IS NOT NULL
             GROUP BY e.source_location ORDER BY e.source_location
            """.formatted(ACTIVE_ELEMENT);

    /** La sección se calcula por posición: no se guarda (README del inventario, D-2). */
    static final String SECTION_AT = """
            SELECT z.code, z.name FROM zones z
              JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = 'SECTION'
              JOIN green_elements e ON e.code = :code AND e.deleted_at IS NULL
             WHERE z.deleted_at IS NULL AND ST_Contains(z.boundary, e.location)
             ORDER BY z.area_m2 LIMIT 1
            """;
}
