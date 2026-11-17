package pe.edu.pucp.hesperides.modules.imports.species;

import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;

import java.math.BigDecimal;
import java.util.List;

/**
 * La vista previa de una carga de especies botánicas. Se guarda en el lote tal
 * cual: lo que se confirma es exactamente lo que se vio.
 */
public record SpeciesPreview(int totalRows, boolean decimalComma, List<PlannedRow> rows, List<Issue> issues,
                             List<SkippedInactiveSpecies> skippedInactiveSpecies) {

    public SpeciesPreview {
        rows = rows == null ? List.of() : List.copyOf(rows);
        issues = issues == null ? List.of() : List.copyOf(issues);
        skippedInactiveSpecies = skippedInactiveSpecies == null ? List.of() : List.copyOf(skippedInactiveSpecies);
    }

    public record SkippedInactiveSpecies(int line, String scientificName) {
    }

    /** Una fila que se escribirá, con sus valores efectivos ya resueltos. */
    public record PlannedRow(
            SpeciesDraft draft,
            ImportAction action,
            Long existingId,
            String existingSlug,
            String existingScientificName,
            Boolean previousActive,
            String existingDataFingerprint,
            Boolean previousCritical,
            BigDecimal previousHeightM,
            BigDecimal previousCrownRadiusM,
            String effectiveVegetationTypeCode,
            String effectiveOriginCode,
            boolean effectiveCritical,
            BigDecimal effectiveHeightM,
            String effectiveHeightSourceCode,
            BigDecimal effectiveCrownRadiusM,
            String effectiveCrownRadiusSourceCode,
            boolean effectiveUsesTrunkHeight,
            boolean effectiveUsesDbh,
            boolean skipExistingPhotoLink
    ) implements PlannedLine {

        @Override
        public int line() {
            return draft.line();
        }

        @Override
        public boolean isPossibleDuplicate() {
            return false;
        }
    }

    public boolean canConfirm() {
        return issues.isEmpty() && (!rows.isEmpty() || !skippedInactiveSpecies.isEmpty());
    }
}
