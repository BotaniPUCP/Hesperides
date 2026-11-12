package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Una especie del catálogo. {@code slug} identifica la especie en la dirección
 * de su ficha. {@code imageUrl} es la miniatura principal y {@code imageSource}
 * dice de dónde sale: {@code SPECIES} (foto genérica), {@code SPECIMEN} (foto de
 * uno de sus ejemplares) o nulo si no hay ninguna. {@code photos} trae todas las
 * genéricas solo en la ficha; en el listado viene vacío (SPEC-104 §3).
 */
public record SpeciesResponse(String slug, String scientificName, String commonName, List<String> otherNames,
                              String family, String vegetationTypeCode, String vegetationTypeName,
                              String originCode, String originName, String description, String careNotes,
                              long specimenCount, String imageUrl, String imageSource,
                              List<SpeciesPhotoResponse> photos,
                              boolean critical, BigDecimal referenceHeightM, String referenceHeightSourceCode,
                              String referenceHeightSourceName, BigDecimal referenceCrownRadiusM,
                              String referenceCrownRadiusSourceCode, String referenceCrownRadiusSourceName,
                              boolean usesTrunkHeight, boolean usesDbh, long unmeasuredSpecimenCount,
                              List<ExtraMeasureResponse> extraMeasures) {
}
