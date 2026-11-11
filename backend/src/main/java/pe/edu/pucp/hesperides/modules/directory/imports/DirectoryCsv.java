package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.ArrayList;
import java.util.List;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/**
 * Un CSV del Directorio con exactamente las columnas de su estándar. Una columna
 * de más suele ser un nombre mal escrito: sus datos se perderían en silencio.
 */
final class DirectoryCsv {

    /** Más filas no caben en una vista previa legible; un archivo así se parte en varios. */
    static final int MAX_ROWS = 2000;

    private DirectoryCsv() {
    }

    static CsvTable read(byte[] csv, List<String> columns, List<String> optionalColumns) {
        CsvTable table = CsvTable.parse(csv);
        List<String> allowed = new ArrayList<>(columns);
        allowed.addAll(optionalColumns);
        List<String> missing = columns.stream().filter(c -> !table.header().contains(c)).toList();
        if (!missing.isEmpty()) {
            throw new ValidationException("The file is missing the columns: " + String.join(", ", missing));
        }
        List<String> unknown = table.header().stream().filter(c -> !allowed.contains(c)).toList();
        if (!unknown.isEmpty()) {
            throw new ValidationException("The file has unknown columns: " + String.join(", ", unknown)
                    + ". Check the spelling against the standard");
        }
        if (table.rows().size() > MAX_ROWS) {
            throw new ValidationException("The file has more than " + MAX_ROWS + " rows: split it into smaller files");
        }
        return table;
    }
}
