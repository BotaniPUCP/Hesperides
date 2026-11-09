package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.ArrayList;
import java.util.List;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.PlannedRow;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowAction;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowIssue;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.StagedRow;

/**
 * Una fila ya leída: lo que se pediría crear y lo que le impide hacerlo. Acumula
 * todos los problemas de la fila, no solo el primero, para corregirlos de una vez.
 */
final class Planned<T> {

    private final int line;
    private final String name;
    private final List<RowIssue> issues = new ArrayList<>();
    private final List<String> missing = new ArrayList<>();
    private T request;
    private boolean exists;

    Planned(int line, String name) {
        this.line = line;
        this.name = name;
    }

    void fail(String column, IssueCode code, String detail) {
        issues.add(new RowIssue(line, column, code, detail));
    }

    /** Una referencia que no está en el Directorio: la fila se omite, no bloquea el archivo. */
    void missing(String reference) {
        missing.add(reference);
    }

    void markExisting() {
        exists = true;
    }

    void request(T value) {
        request = value;
    }

    /** Sin errores ni referencias faltantes: se puede seguir revisando contra lo registrado. */
    boolean ok() {
        return issues.isEmpty() && missing.isEmpty();
    }

    /** Un error pesa más que una referencia faltante: hay que corregirlo igual. */
    RowAction action() {
        if (!issues.isEmpty()) {
            return RowAction.ERROR;
        }
        if (!missing.isEmpty()) {
            return RowAction.OMIT;
        }
        return exists ? RowAction.SKIP : RowAction.CREATE;
    }

    StagedRow<T> toStaged() {
        PlannedRow row = new PlannedRow(line, name, action(), List.copyOf(issues), List.copyOf(missing));
        return new StagedRow<>(row, action() == RowAction.CREATE ? request : null);
    }
}
