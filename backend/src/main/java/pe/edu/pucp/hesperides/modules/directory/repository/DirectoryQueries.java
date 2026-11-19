package pe.edu.pucp.hesperides.modules.directory.repository;

/** SQL largo del Directorio, fuera de los repositorios para que se lean. */
final class DirectoryQueries {

    /** Contactos vigentes vinculados a la organización {@code o}. */
    private static final String CONTACT_COUNT = """
            (SELECT count(*) FROM contact_organizations co JOIN contacts c ON c.id = co.contact_id AND c.deleted_at IS NULL
              WHERE co.organization_id = o.id AND co.deleted_at IS NULL)""";

    /** Alias vigentes de la organización {@code o}, en orden alfabético. */
    private static final String ALIASES = """
            COALESCE((SELECT array_agg(a.alias ORDER BY lower(a.alias)) FROM organization_aliases a
                       WHERE a.organization_id = o.id AND a.deleted_at IS NULL), '{}')""";

    /**
     * Todas las vigentes para buscarlas en el navegador (SPEC-119). {@code search_key} lleva las
     * columnas en que se buscaba antes, incluidos RUC y alias, aunque la tabla no los muestre.
     */
    static final String ORGANIZATION_ALL = """
            SELECT o.code, o.name, t.code AS type_code, t.label AS type_label, o.phone, %s AS contacts,
                   %s AS aliases,
                   directory_key(concat_ws(' ', o.code, o.name, o.ruc, array_to_string(%s, ' '))) AS search_key
              FROM organizations o JOIN catalog_items t ON t.id = o.type_item_id
             WHERE o.deleted_at IS NULL
             ORDER BY lower(o.name)""".formatted(CONTACT_COUNT, ALIASES, ALIASES);

    /**
     * Todos, también los dados de baja (marcados con {@code active}): los buscadores los muestran
     * para que no se registre de nuevo a alguien que ya estuvo (decisión del 18 nov 2026).
     */
    static final String CONTACT_ALL = """
            SELECT c.id, c.code, c.full_name, c.extension, c.mobile, c.email, c.deleted_at IS NULL AS active,
                   directory_key(concat_ws(' ', c.code, c.full_name, c.email, c.extension, c.mobile)) AS search_key
              FROM contacts c
             ORDER BY lower(c.full_name), c.code""";

    /** Organizaciones de varios contactos a la vez, para no consultar una por fila. */
    static final String ORGANIZATIONS_OF_CONTACTS = """
            SELECT co.contact_id, o.code, o.name, o.deleted_at IS NULL AS active, co.role
              FROM contact_organizations co JOIN organizations o ON o.id = co.organization_id
             WHERE co.deleted_at IS NULL AND co.contact_id IN (:ids)
             ORDER BY o.deleted_at IS NOT NULL, lower(o.name)""";

    static final String CONTACTS_OF_ORGANIZATION = """
            SELECT c.code, c.full_name, c.extension, c.mobile, c.email, co.role
              FROM contact_organizations co JOIN contacts c ON c.id = co.contact_id AND c.deleted_at IS NULL
             WHERE co.organization_id = :id AND co.deleted_at IS NULL ORDER BY lower(c.full_name)""";

    private DirectoryQueries() {
    }
}
