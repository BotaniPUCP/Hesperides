package pe.edu.pucp.hesperides.modules.inventory.dto;

/**
 * Resultado ligero de búsqueda global de ejemplares para autocompletado y spotlight.
 */
public record SpecimenSearchResultResponse(
        String code,
        String sourceReference,
        String sourceLocation,
        String legacyCode,
        String speciesSlug,
        String speciesCommonName,
        String speciesScientificName
) {
}
