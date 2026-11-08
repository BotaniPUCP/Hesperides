package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.List;

/** Lo que devuelve el registro masivo del Directorio. */
public final class ImportDtos {

    private ImportDtos() {
    }

    /** CREATE se crea; SKIP ya existe y se omite; ERROR impide confirmar el archivo. */
    public enum RowAction {
        CREATE, SKIP, ERROR
    }

    /**
     * Un problema de una fila. {@code code} es estable para que el frontend lo
     * traduzca; {@code detail} trae el dato que lo explica (una organización, un nombre).
     */
    public record RowIssue(int line, String column, IssueCode code, String detail) {
    }

    public record PlannedRow(int line, String name, RowAction action, List<RowIssue> issues) {
    }

    public record ImportPlan(String kind, List<PlannedRow> rows, long creates, long skips, long errors) {

        static ImportPlan of(String kind, List<PlannedRow> rows) {
            return new ImportPlan(kind, rows, count(rows, RowAction.CREATE), count(rows, RowAction.SKIP),
                    count(rows, RowAction.ERROR));
        }

        private static long count(List<PlannedRow> rows, RowAction action) {
            return rows.stream().filter(r -> r.action() == action).count();
        }
    }

    public record ImportOutcome(int created, int skipped) {
    }
}
