package pe.edu.pucp.hesperides.modules.inventory.dto;

/**
 * Un ejemplar en un listado. {@code sourceReference} y {@code sourceLocation} son
 * los de la fuente (catastro): el código propio es {@code code}. El tipo de vegetación, si su
 * especie es crítica, si está medido y {@code searchKey} sirven para filtrar en el navegador (SPEC-119).
 */
public record SpecimenResponse(String code, String sourceReference, String sourceLocation, Double latitude,
                               Double longitude, String photoUrl, String imageUrl, String thumbnailUrl, int quantity,
                               String notes, String speciesSlug, String speciesCommonName, String speciesScientificName,
                               String vegetationTypeCode, boolean speciesCritical, boolean measured, String searchKey) {
}
