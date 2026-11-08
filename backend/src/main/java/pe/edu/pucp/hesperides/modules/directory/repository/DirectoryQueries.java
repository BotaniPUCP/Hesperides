package pe.edu.pucp.hesperides.modules.directory.repository;

/** SQL largo del Directorio, fuera de los repositorios para que se lean. */
final class DirectoryQueries {

    /** Contactos vigentes vinculados a la organización {@code o}. */
    private static final String CONTACT_COUNT = """
            (SELECT count(*) FROM contact_organizations co JOIN contacts c ON c.id = co.contact_id AND c.deleted_at IS NULL
              WHERE co.organization_id = o.id AND co.deleted_at IS NULL)""";

    static final String ORGANIZATION_FILTER = """
              FROM organizations o JOIN catalog_items t ON t.id = o.type_item_id
             WHERE o.deleted_at IS NULL
               AND (CAST(:type AS TEXT) IS NULL OR t.code = :type)
               AND (CAST(:search AS TEXT) IS NULL OR directory_key(concat_ws(' ', o.code, o.name, o.ruc,
                    (SELECT string_agg(a.alias, ' ') FROM organization_aliases a
                      WHERE a.organization_id = o.id AND a.deleted_at IS NULL))) LIKE directory_key(:search))""";

    static final String ORGANIZATION_PAGE = "SELECT o.code, o.name, t.code AS type_code, t.label AS type_label, o.phone, "
            + CONTACT_COUNT + " AS contacts " + ORGANIZATION_FILTER
            + " ORDER BY lower(o.name) LIMIT :size OFFSET :offset";

    /** {@code word_similarity}: «derecho» casi no se parece a «Facultad de Derecho» entero, pero está contenido en él. */
    static final String ORGANIZATION_SIMILAR = """
            SELECT code, name FROM (
                SELECT o.code, o.name, GREATEST(similarity(directory_key(o.name), directory_key(:text)),
                       word_similarity(directory_key(:text), directory_key(o.name)),
                       COALESCE((SELECT max(similarity(directory_key(a.alias), directory_key(:text)))
                                   FROM organization_aliases a WHERE a.organization_id = o.id AND a.deleted_at IS NULL), 0))
                       AS sim
                  FROM organizations o WHERE o.deleted_at IS NULL) s
             WHERE sim >= :threshold ORDER BY sim DESC, lower(name) LIMIT :limit""";

    static final String CONTACT_FILTER = """
              FROM contacts c
             WHERE c.deleted_at IS NULL
               AND (CAST(:search AS TEXT) IS NULL OR directory_key(concat_ws(' ', c.code, c.full_name, c.email,
                    c.extension, c.mobile)) LIKE directory_key(:search))
               AND (CAST(:organization AS TEXT) IS NULL OR EXISTS (SELECT 1 FROM contact_organizations co
                    JOIN organizations o ON o.id = co.organization_id
                    WHERE co.contact_id = c.id AND co.deleted_at IS NULL AND o.code = :organization))
               AND (NOT :withoutOrganization OR NOT EXISTS (SELECT 1 FROM contact_organizations co
                    JOIN organizations o ON o.id = co.organization_id AND o.deleted_at IS NULL
                    WHERE co.contact_id = c.id AND co.deleted_at IS NULL))""";

    static final String CONTACT_PAGE = "SELECT c.id, c.code, c.full_name, c.extension, c.mobile, c.email "
            + CONTACT_FILTER + " ORDER BY lower(c.full_name), c.code LIMIT :size OFFSET :offset";

    static final String CONTACT_SIMILAR = """
            SELECT id, code, full_name, extension, mobile, email FROM (
                SELECT c.*, GREATEST(similarity(directory_key(c.full_name), directory_key(:text)),
                       word_similarity(directory_key(:text), directory_key(c.full_name))) AS sim
                  FROM contacts c WHERE c.deleted_at IS NULL) s
             WHERE sim >= :threshold ORDER BY sim DESC, lower(full_name) LIMIT :limit""";

    /** Organizaciones de varios contactos a la vez, para no consultar una por fila. */
    static final String ORGANIZATIONS_OF_CONTACTS = """
            SELECT co.contact_id, o.code, o.name, o.deleted_at IS NULL AS active
              FROM contact_organizations co JOIN organizations o ON o.id = co.organization_id
             WHERE co.deleted_at IS NULL AND co.contact_id IN (:ids)
             ORDER BY o.deleted_at IS NOT NULL, lower(o.name)""";

    static final String CONTACTS_OF_ORGANIZATION = """
            SELECT c.code, c.full_name, c.extension, c.mobile, c.email
              FROM contact_organizations co JOIN contacts c ON c.id = co.contact_id AND c.deleted_at IS NULL
             WHERE co.organization_id = :id AND co.deleted_at IS NULL ORDER BY lower(c.full_name)""";

    private DirectoryQueries() {
    }
}
