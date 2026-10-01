package pe.edu.pucp.hesperides.modules.inventory.dto;

/**
 * Un ejemplar en un listado. {@code sourceReference} y {@code sourceLocation} son
 * los de la fuente (catastro): el código propio es {@code code}.
 */
public record SpecimenResponse(String code, String sourceReference, String sourceLocation, Double latitude,
                               Double longitude, String photoUrl, String thumbnailUrl, int quantity, String notes) {
}
