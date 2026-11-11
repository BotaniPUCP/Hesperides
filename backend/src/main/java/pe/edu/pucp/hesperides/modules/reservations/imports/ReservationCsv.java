package pe.edu.pucp.hesperides.modules.reservations.imports;

import java.util.List;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/**
 * Un CSV de reservas con exactamente las columnas de su estándar. Una columna de
 * más suele ser un nombre mal escrito y sus datos se perderían en silencio.
 */
final class ReservationCsv {

    /** Más filas no caben en una vista previa legible; un archivo así se parte en varios. */
    static final int MAX_ROWS = 2000;

    private ReservationCsv() {
    }

    static CsvTable read(byte[] csv, List<String> columns) {
        CsvTable table = CsvTable.parse(csv);
        List<String> missing = columns.stream().filter(c -> !table.header().contains(c)).toList();
        if (!missing.isEmpty()) {
            throw new ValidationException("The file is missing the columns: " + String.join(", ", missing));
        }
        List<String> unknown = table.header().stream().filter(c -> !columns.contains(c)).toList();
        if (!unknown.isEmpty()) {
            throw new ValidationException("The file has unknown columns: " + String.join(", ", unknown)
                    + ". Check the spelling against the standard");
        }
        if (table.rows().size() > MAX_ROWS) {
            throw new ValidationException("The file has more than " + MAX_ROWS + " rows: split it in several files");
        }
        return table;
    }
}
