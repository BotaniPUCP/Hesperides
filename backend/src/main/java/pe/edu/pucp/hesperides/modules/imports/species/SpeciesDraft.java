package pe.edu.pucp.hesperides.modules.imports.species;

import java.math.BigDecimal;
import java.util.List;

/** Una fila leída del CSV de especies antes de cruzarla con el catálogo en base de datos. */
public record SpeciesDraft(
        int line,
        boolean valid,
        String scientificName,
        String commonName,
        List<String> otherNames,
        String family,
        String vegetationTypeCode,
        String originCode,
        String description,
        String careNotes,
        Boolean critical,
        BigDecimal referenceHeightM,
        String referenceHeightSourceCode,
        BigDecimal referenceCrownRadiusM,
        String referenceCrownRadiusSourceCode,
        Boolean usesTrunkHeight,
        Boolean usesDbh,
        String photo
) {
}
