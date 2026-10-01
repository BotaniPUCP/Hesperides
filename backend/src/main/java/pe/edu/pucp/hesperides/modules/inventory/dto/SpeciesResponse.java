package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.util.List;

/**
 * Una especie del catálogo. {@code slug} identifica la especie en la dirección
 * de su ficha; {@code imageUrl} es la miniatura de la foto de uno de sus ejemplares.
 */
public record SpeciesResponse(String slug, String scientificName, String commonName, List<String> otherNames,
                              String family, String vegetationTypeCode, String vegetationTypeName,
                              long specimenCount, String imageUrl) {
}
