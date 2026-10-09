package pe.edu.pucp.hesperides.modules.imports.features;

import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;

import java.util.List;

/** La vista previa de una carga de tachos o bebederos; se guarda en el lote tal cual. */
public record FeaturePreview(FeatureKind kind, boolean decimalComma, List<PlannedFeature> rows, List<Issue> issues) {

    /** Un componente que se escribirá; si cae a menos de 1 m de otro de su tipo, se decide. */
    public record PlannedFeature(FeatureDraft draft, ImportAction action, String duplicateOf, Double duplicateDistanceM)
            implements PlannedLine {

        @Override
        public int line() {
            return draft.line();
        }

        @Override
        public boolean isPossibleDuplicate() {
            return duplicateOf != null;
        }
    }

    public boolean canConfirm() {
        return issues.isEmpty() && !rows.isEmpty();
    }
}
