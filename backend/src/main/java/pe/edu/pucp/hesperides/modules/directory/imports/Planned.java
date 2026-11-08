package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.ArrayList;
import java.util.List;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.PlannedRow;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowAction;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowIssue;

/**
 * Una fila ya leída: lo que se pediría crear y lo que le impide hacerlo. Acumula
 * todos los problemas de la fila, no solo el primero, para corregirlos de una vez.
 */
final class Planned<T> {

    private final int line;
    private final String name;
    private final List<RowIssue> issues = new ArrayList<>();
    private T request;
    private boolean exists;

    Planned(int line, String name) {
        this.line = line;
        this.name = name;
    }

    void fail(String column, IssueCode code, String detail) {
        issues.add(new RowIssue(line, column, code, detail));
    }

    void markExisting() {
        exists = true;
    }

    void request(T value) {
        request = value;
    }

    boolean ok() {
        return issues.isEmpty();
    }

    T request() {
        return request;
    }

    RowAction action() {
        if (!issues.isEmpty()) {
            return RowAction.ERROR;
        }
        return exists ? RowAction.SKIP : RowAction.CREATE;
    }

    PlannedRow toRow() {
        return new PlannedRow(line, name, action(), List.copyOf(issues));
    }
}
