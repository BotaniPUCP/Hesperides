package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema.Issue;

import java.util.List;

/**
 * La vista previa de una carga de ejemplares (SPEC-103 D-04). Se guarda en el
 * lote tal cual: lo que se confirma es exactamente lo que se vio.
 *
 * @param issues errores de formato; mientras haya alguno no se puede confirmar
 */
public record SpecimenPreview(boolean decimalComma, List<PlannedRow> rows, List<SpeciesCount> unknownSpecies,
                              List<Issue> issues) {

    public enum Action { CREATE, UPDATE }

    /** Una fila que se escribirá, con su especie ya resuelta. */
    public record PlannedRow(SpecimenDraft draft, Action action, long speciesId, String speciesSlug,
                             String duplicateOf, Double duplicateDistanceM) {

        public boolean isPossibleDuplicate() {
            return duplicateOf != null;
        }
    }

    /** Una especie que no está en el catálogo y cuántas filas la nombraban: esas filas se omiten. */
    public record SpeciesCount(String name, int rows) {
    }

    public boolean canConfirm() {
        return issues.isEmpty() && !rows.isEmpty();
    }
}
