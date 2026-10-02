package pe.edu.pucp.hesperides.modules.inventory.dto;

/**
 * Una foto genérica de la especie con su crédito (SPEC-104 D-04). Autor,
 * licencia y fuente son nulos cuando la foto es propia del cliente.
 */
public record SpeciesPhotoResponse(String thumbnailUrl, String imageUrl, String author, String license, String sourceUrl) {
}
