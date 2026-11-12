package pe.edu.pucp.hesperides.modules.inventory.repository;

import java.math.BigDecimal;
import java.util.List;

/** Una especie tal como sale de la base, con la foto original de uno de sus ejemplares. */
public record SpeciesRow(String slug, String scientificName, String commonName, List<String> otherNames,
                         String family, String typeCode, String typeLabel, String originCode, String originLabel,
                         String description, String careNotes, long specimenCount, String photoUrl, boolean active,
                         Long speciesPhotoId, Long specimenPhotoId, boolean critical, BigDecimal referenceHeightM,
                         String referenceHeightSourceCode, String referenceHeightSourceName,
                         BigDecimal referenceCrownRadiusM, String referenceCrownRadiusSourceCode,
                         String referenceCrownRadiusSourceName, boolean usesTrunkHeight, boolean usesDbh, long unmeasuredSpecimenCount) {
}
