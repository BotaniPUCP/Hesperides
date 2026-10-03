package pe.edu.pucp.hesperides.modules.places.repository;

/** SQL de la cola de migración de referencias. */
final class ReferenceLinkQueries {

    /** Una referencia pendiente: vigente y sin enlace ni descarte vigente. */
    private static final String PENDING = """
            FROM place_references r
            JOIN catalog_items c ON c.id = r.category_item_id
           WHERE r.deleted_at IS NULL AND r.is_active
             AND NOT EXISTS (SELECT 1 FROM place_reference_links l WHERE l.reference_id = r.id AND l.deleted_at IS NULL)
             AND (CAST(:search AS TEXT) IS NULL OR unaccent(lower(r.name)) LIKE unaccent(lower(:search)))
            """;

    /** Mismo nombre (sin tildes ni mayúsculas) es un solo grupo: «Pabellón Z» doce veces se decide una vez. */
    private static final String GROUP_KEY = "unaccent(lower(trim(r.name)))";

    static final String PENDING_GROUPS = """
            SELECT min(r.name) AS name, min(c.label) AS category, string_agg(r.code, ',' ORDER BY r.code) AS codes,
                   ST_Y(ST_Centroid(ST_Collect(r.location))) AS lat, ST_X(ST_Centroid(ST_Collect(r.location))) AS lon
            """ + PENDING + "GROUP BY " + GROUP_KEY + " ORDER BY count(*) DESC, " + GROUP_KEY + " LIMIT :limit OFFSET :offset";

    static final String COUNT_PENDING_GROUPS = "SELECT count(DISTINCT " + GROUP_KEY + ") " + PENDING;

    static final String PROGRESS = """
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE l.id IS NOT NULL AND NOT l.discarded) AS linked,
                   count(*) FILTER (WHERE l.discarded) AS discarded
              FROM place_references r
              LEFT JOIN place_reference_links l ON l.reference_id = r.id AND l.deleted_at IS NULL
             WHERE r.deleted_at IS NULL AND r.is_active""";

    private ReferenceLinkQueries() {
    }
}
