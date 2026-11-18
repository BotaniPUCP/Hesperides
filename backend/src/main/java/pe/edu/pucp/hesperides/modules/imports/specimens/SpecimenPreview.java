package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;

import java.util.List;
import java.util.Map;

/**
 * La vista previa de una carga de ejemplares (SPEC-103 D-04). Se guarda en el
 * lote tal cual: lo que se confirma es exactamente lo que se vio.
 *
 * @param issues errores de formato; mientras haya alguno no se puede confirmar
 */
public record SpecimenPreview(int totalRows, boolean decimalComma, List<PlannedRow> rows,
                              List<SpeciesCount> unknownSpecies, List<Issue> issues,
                              Map<String, String> speciesBindings, List<SpeciesBinding> speciesBindingSummary,
                              Integer bindingKeyVersion, String planRevision) {

    public static final int CURRENT_BINDING_KEY_VERSION = 2;

    public SpecimenPreview(int totalRows, boolean decimalComma, List<PlannedRow> rows,
                           List<SpeciesCount> unknownSpecies, List<Issue> issues,
                           Map<String, String> speciesBindings, List<SpeciesBinding> speciesBindingSummary,
                           Integer bindingKeyVersion) {
        this(totalRows, decimalComma, rows, unknownSpecies, issues, speciesBindings, speciesBindingSummary,
                bindingKeyVersion, null);
    }

    public SpecimenPreview(int totalRows, boolean decimalComma, List<PlannedRow> rows,
                           List<SpeciesCount> unknownSpecies, List<Issue> issues,
                           Map<String, String> speciesBindings, List<SpeciesBinding> speciesBindingSummary) {
        this(totalRows, decimalComma, rows, unknownSpecies, issues, speciesBindings, speciesBindingSummary,
                CURRENT_BINDING_KEY_VERSION, null);
    }

    public SpecimenPreview(boolean decimalComma, List<PlannedRow> rows, List<SpeciesCount> unknownSpecies,
                           List<Issue> issues) {
        this(rows.size() + unknownSpecies.stream().mapToInt(SpeciesCount::rows).sum(), decimalComma,
                rows, unknownSpecies, issues, Map.of(), List.of(), CURRENT_BINDING_KEY_VERSION, null);
    }

    public SpecimenPreview withPlanRevision(String revision) {
        return new SpecimenPreview(totalRows, decimalComma, rows, unknownSpecies, issues,
                speciesBindings, speciesBindingSummary, bindingKeyVersion, revision);
    }

    /** Una fila que se escribirá, con su especie ya resuelta. */
    public record PlannedRow(SpecimenDraft draft, ImportAction action, long speciesId, String speciesSlug,
                             String speciesScientificName, boolean speciesActive, String speciesTypeCode,
                             String speciesDataFingerprint, String specimenDataFingerprint,
                             String resolution, Long previousSpeciesId, String previousSpeciesScientificName,
                             String duplicateOf, Double duplicateDistanceM) implements PlannedLine {

        @Override
        public int line() {
            return draft.line();
        }

        @Override
        public boolean isPossibleDuplicate() {
            return duplicateOf != null;
        }
    }

    /** Una especie que no está en el catálogo y cuántas filas la nombraban: esas filas se omiten. */
    public record SpeciesCount(String name, int rows, String sourceKey, String reason) {
        public SpeciesCount(String name, int rows) {
            this(name, rows, name, "NOT_FOUND");
        }
    }

    public record SpeciesBinding(String sourceKey, String sourceName, int rows, String speciesSlug,
                                 String scientificName, boolean active, String resolution) {
    }

    public boolean canConfirm() {
        return issues.isEmpty() && !rows.isEmpty();
    }
}
