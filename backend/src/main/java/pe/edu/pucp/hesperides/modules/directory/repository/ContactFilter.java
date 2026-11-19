package pe.edu.pucp.hesperides.modules.directory.repository;

/**
 * Filtros de la lista de contactos.
 *
 * @param search patrón LIKE ya armado, o null
 * @param withoutOrganization solo los que no tienen ninguna organización vigente
 */
public record ContactFilter(String search, String organizationCode, boolean withoutOrganization) {
}
