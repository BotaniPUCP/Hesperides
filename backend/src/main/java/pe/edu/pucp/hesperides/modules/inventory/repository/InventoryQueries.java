package pe.edu.pucp.hesperides.modules.inventory.repository;

/**
 * SQL del inventario verde. Las listas salen completas, con un {@code search_key} sin tildes ni
 * mayúsculas: buscar se hace en el navegador, como escribe el personal (SPEC-119).
 */
final class InventoryQueries {

    private InventoryQueries() {
    }

    private static final String ACTIVE_ELEMENT = "e.deleted_at IS NULL AND e.is_active";

    /** La fuente de cada promedio: en una especie, la altura y la copa pueden venir de sitios distintos. */
    private static final String REFERENCE_SOURCES = """
              LEFT JOIN catalog_items hs ON hs.id = s.reference_height_source_item_id
              LEFT JOIN catalog_items cs ON cs.id = s.reference_crown_radius_source_item_id
            """;

    static final String SPECIES_COLUMNS = """
            SELECT s.slug, s.scientific_name, s.common_name, s.family, t.code AS type_code, t.label AS type_label,
                   o.code AS origin_code, o.label AS origin_label, s.description, s.care_notes,
                   (SELECT count(*) FROM green_elements e WHERE e.species_id = s.id AND %1$s) AS specimen_count,
                   (SELECT e.photo_url FROM green_elements e WHERE e.species_id = s.id AND %1$s AND e.photo_url IS NOT NULL
                     ORDER BY e.data_source = 'MEASURED' DESC, e.code LIMIT 1) AS photo_url,
                   (SELECT string_agg(n.name, '|' ORDER BY n.name) FROM species_common_names n
                     WHERE n.species_id = s.id AND n.deleted_at IS NULL) AS other_names,
                   (SELECT sp.id FROM species_photos sp WHERE sp.species_id = s.id AND sp.deleted_at IS NULL
                     ORDER BY sp.sort_order LIMIT 1) AS species_photo_id,
                   (SELECT a.id FROM green_element_attachments a JOIN green_elements e ON e.id = a.green_element_id
                     WHERE e.species_id = s.id AND %1$s AND a.deleted_at IS NULL
                     ORDER BY e.data_source = 'MEASURED' DESC, e.code, a.id DESC LIMIT 1) AS specimen_photo_id,
                    s.is_active, s.is_critical, s.reference_height_m, hs.code AS height_source_code, hs.label AS height_source_label,
                   s.reference_crown_radius_m, cs.code AS crown_source_code, cs.label AS crown_source_label,
                   s.uses_trunk_height, s.uses_dbh,
                   (SELECT count(*) FROM green_elements e WHERE e.species_id = s.id AND %1$s
                       AND e.data_source <> 'MEASURED') AS unmeasured_specimen_count,
                   unaccent(lower(concat_ws(' ', s.scientific_name, s.common_name, s.family,
                       (SELECT string_agg(n.name, ' ') FROM species_common_names n
                         WHERE n.species_id = s.id AND n.deleted_at IS NULL)))) AS search_key
              FROM species s
              JOIN catalog_items t ON t.id = s.species_type_item_id
              LEFT JOIN catalog_items o ON o.id = s.origin_item_id
            """.formatted(ACTIVE_ELEMENT) + REFERENCE_SOURCES;

    /** Activa, o dada de baja pero con ejemplares vigentes: «en proceso de retiro». */
    private static final String VISIBLE_SPECIES = " WHERE s.deleted_at IS NULL"
            + " AND (s.is_active OR EXISTS (SELECT 1 FROM green_elements visible_element"
            + " WHERE visible_element.species_id = s.id AND visible_element.is_active AND visible_element.deleted_at IS NULL))";

    /**
     * Todo el catálogo visible, para buscarlo y filtrarlo en el navegador (SPEC-119). Primero las
     * especies con más ejemplares: son las que más se buscan.
     */
    static final String SPECIES_ALL = "SELECT * FROM (" + SPECIES_COLUMNS + VISIBLE_SPECIES + ") x"
            + " ORDER BY specimen_count DESC, common_name";

    static final String SPECIES_BY_SLUG = SPECIES_COLUMNS + VISIBLE_SPECIES + " AND s.slug = :slug";

    static final String SPECIES_BY_SLUG_ANY = SPECIES_COLUMNS + " WHERE s.slug = :slug";

    static final String TOTALS = """
            SELECT (SELECT count(*) FROM species s WHERE s.deleted_at IS NULL
                      AND (s.is_active OR EXISTS (SELECT 1 FROM green_elements active_element
                           WHERE active_element.species_id = s.id AND active_element.is_active
                             AND active_element.deleted_at IS NULL))) AS species,
                   (SELECT count(*) FROM green_elements e WHERE %s) AS specimens
            """.formatted(ACTIVE_ELEMENT);

    static final String TYPE_COUNTS = """
            SELECT t.code, t.label, count(e.id) AS total
              FROM catalog_items t JOIN catalog_types ct ON ct.id = t.catalog_type_id AND ct.code = 'SPECIES_TYPE'
              LEFT JOIN species s ON s.species_type_item_id = t.id AND s.deleted_at IS NULL
                    AND (s.is_active OR EXISTS (SELECT 1 FROM green_elements visible_element
                         WHERE visible_element.species_id = s.id AND visible_element.is_active
                           AND visible_element.deleted_at IS NULL))
              LEFT JOIN green_elements e ON e.species_id = s.id AND %s
             WHERE t.is_active
             GROUP BY t.code, t.label, t.sort_order ORDER BY t.sort_order
            """.formatted(ACTIVE_ELEMENT);

    static final String SPECIMEN_COLUMNS = """
            SELECT e.id, e.code, e.source_reference, e.source_location, e.legacy_code, ST_Y(e.location) AS lat,
                   ST_X(e.location) AS lon, e.photo_url, e.quantity, e.notes, e.height_m, e.trunk_height_m, e.dbh_cm,
                   e.crown_radius_m, e.is_banded, e.data_source, et.code AS element_type_code,
                   et.label AS element_type_label, s.slug,
                   (SELECT a.id FROM green_element_attachments a WHERE a.green_element_id = e.id AND a.deleted_at IS NULL
                     ORDER BY a.id DESC LIMIT 1) AS attachment_id,
                   s.common_name AS species_common_name, s.scientific_name AS species_scientific_name,
                   e.measured_at, s.is_critical AS species_critical, s.reference_height_m, s.reference_crown_radius_m,
                   hs.label AS height_source_label, cs.label AS crown_source_label,
                   (SELECT t.code FROM catalog_items t WHERE t.id = s.species_type_item_id) AS vegetation_type_code,
                   unaccent(lower(concat_ws(' ', e.code, e.source_reference, e.source_location, e.legacy_code, e.notes,
                       s.common_name, s.scientific_name))) AS search_key
              FROM green_elements e
              JOIN species s ON s.id = e.species_id
              JOIN catalog_items et ON et.id = e.element_type_item_id
            """ + REFERENCE_SOURCES;

    /** Todos los ejemplares vigentes, para buscarlos, filtrarlos y ordenarlos en el navegador (SPEC-119). */
    static final String SPECIMEN_ALL = SPECIMEN_COLUMNS + " WHERE " + ACTIVE_ELEMENT + " ORDER BY e.code";

    static final String SPECIMEN_BY_CODE = SPECIMEN_COLUMNS + " WHERE e.code = :code AND " + ACTIVE_ELEMENT;

    /** La última poda terminada de un ejemplar: completed_at ya cuenta aunque falte aprobarla. */
    static final String LAST_PRUNING = """
            SELECT max(l.completed_at)::date
              FROM intervention_elements ie
              JOIN green_elements g ON g.id = ie.green_element_id
              JOIN intervention_locations l ON l.id = ie.intervention_location_id
              JOIN interventions i ON i.id = l.intervention_id
              JOIN catalog_items c ON c.id = i.intervention_class_item_id
              WHERE g.id = :id AND c.code = 'PODA' AND l.completed_at IS NOT NULL
               AND ie.deleted_at IS NULL AND l.deleted_at IS NULL AND i.deleted_at IS NULL
            """;

    static final String LOCATIONS = """
            SELECT e.source_location AS location, count(*) AS total
              FROM green_elements e JOIN species s ON s.id = e.species_id
             WHERE (CAST(:slug AS TEXT) IS NULL OR s.slug = :slug) AND %s AND e.source_location IS NOT NULL
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

    static final String RETIRED_SPECIMEN_COLUMNS = """
            SELECT e.id,
                   e.code,
                   s.scientific_name,
                   s.common_name,
                   s.slug AS species_slug,
                   st.label AS vegetation_type,
                   e.source_location,
                   e.source_reference,
                   e.notes,
                   ST_Y(e.location) AS lat,
                   ST_X(e.location) AS lon,
                   e.deleted_at AS retired_at,
                   al.changes ->> 'reason' AS reason,
                   NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS retired_by_name,
                   u.email AS retired_by_email,
                   (SELECT count(*) FROM intervention_elements ie WHERE ie.green_element_id = e.id AND ie.deleted_at IS NULL) AS interventions_count
              FROM green_elements e
              JOIN species s ON s.id = e.species_id
              LEFT JOIN catalog_items st ON st.id = s.species_type_item_id
              LEFT JOIN LATERAL (
                  SELECT al_inner.user_id, al_inner.changes
                    FROM audit_log al_inner
                   WHERE al_inner.entity_type = 'GreenElement'
                     AND al_inner.entity_id = e.id
                     AND al_inner.action = 'GREEN_ELEMENT_SOFT_DELETED'
                   ORDER BY al_inner.id DESC
                   LIMIT 1
              ) al ON true
              LEFT JOIN users u ON u.id = al.user_id
             WHERE e.deleted_at IS NOT NULL
            """;

    static final String RETIRED_SPECIMEN_FILTER = """
              AND (CAST(:search AS TEXT) IS NULL OR unaccent(lower(concat_ws(' ', e.code, s.scientific_name, s.common_name,
                   e.source_location, e.source_reference, COALESCE(al.changes ->> 'reason', '')))) LIKE unaccent(lower(:search)))
            """;

    static final String RETIRED_SPECIMEN_PAGE = RETIRED_SPECIMEN_COLUMNS + RETIRED_SPECIMEN_FILTER
            + " ORDER BY e.deleted_at DESC, e.code DESC LIMIT :limit OFFSET :offset";

    static final String RETIRED_SPECIMEN_COUNT = """
            SELECT count(*)
              FROM green_elements e
              JOIN species s ON s.id = e.species_id
              LEFT JOIN catalog_items st ON st.id = s.species_type_item_id
              LEFT JOIN LATERAL (
                  SELECT al_inner.user_id, al_inner.changes
                    FROM audit_log al_inner
                   WHERE al_inner.entity_type = 'GreenElement'
                     AND al_inner.entity_id = e.id
                     AND al_inner.action = 'GREEN_ELEMENT_SOFT_DELETED'
                   ORDER BY al_inner.id DESC
                   LIMIT 1
              ) al ON true
              LEFT JOIN users u ON u.id = al.user_id
             WHERE e.deleted_at IS NOT NULL
            """ + RETIRED_SPECIMEN_FILTER;

    static final String RETIRED_SPECIMEN_BY_CODE = RETIRED_SPECIMEN_COLUMNS + " AND e.code = :code";

    static final String RETIRED_SPECIMEN_ROW_BY_CODE = SPECIMEN_COLUMNS + " WHERE e.code = :code AND e.deleted_at IS NOT NULL";
}
