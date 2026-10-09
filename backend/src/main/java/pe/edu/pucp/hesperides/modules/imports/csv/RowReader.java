package pe.edu.pucp.hesperides.modules.imports.csv;

import java.util.List;
import java.util.function.Function;

/** Lee celdas de una fila y acumula sus errores sin detenerse en el primero. */
public final class RowReader {
    private final CsvRow row;
    private final List<Issue> issues;
    private boolean ok = true;

    public RowReader(CsvRow row, List<Issue> issues) {
        this.row = row;
        this.issues = issues;
    }

    public CsvRow row() {
        return row;
    }

    public boolean ok() {
        return ok;
    }

    public String text(String column) {
        String v = row.get(column);
        return v.isBlank() ? null : v;
    }

    public String required(String column) {
        String v = text(column);
        if (v == null) {
            fail(column, "Required value is empty");
        }
        return v;
    }

    public <T> T read(String column, Function<String, T> parser) {
        String v = text(column);
        if (v == null) {
            return null;
        }
        try {
            return parser.apply(v);
        } catch (Cells.CellException e) {
            fail(column, e.getMessage());
            return null;
        }
    }

    public void fail(String column, String message) {
        ok = false;
        issues.add(new Issue(row.line(), column, message));
    }
}
