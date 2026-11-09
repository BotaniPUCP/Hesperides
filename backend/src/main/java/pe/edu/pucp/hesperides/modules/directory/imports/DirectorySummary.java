package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import pe.edu.pucp.hesperides.engine.directory.DirectoryKey;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.MissingOrganization;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.PlannedRow;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowAction;

/** Los totales de una carga del Directorio, iguales en la vista previa y en el resultado. */
final class DirectorySummary {

    private DirectorySummary() {
    }

    static int count(List<PlannedRow> rows, RowAction action) {
        return (int) rows.stream().filter(r -> r.action() == action).count();
    }

    /**
     * Cada organización que falta, con las filas que dejó fuera, en el orden en que
     * aparece. «OIE» y «oie» son la misma: se agrupan sin tildes ni mayúsculas.
     */
    static List<MissingOrganization> missingOrganizations(List<PlannedRow> rows) {
        Map<String, String> names = new LinkedHashMap<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        rows.stream().filter(r -> r.action() == RowAction.OMIT).forEach(r -> r.missing().stream()
                .map(name -> Map.entry(DirectoryKey.of(name), name)).distinct().forEach(e -> {
                    names.putIfAbsent(e.getKey(), e.getValue());
                    counts.merge(e.getKey(), 1, Integer::sum);
                }));
        return names.entrySet().stream().map(e -> new MissingOrganization(e.getValue(), counts.get(e.getKey()))).toList();
    }
}
