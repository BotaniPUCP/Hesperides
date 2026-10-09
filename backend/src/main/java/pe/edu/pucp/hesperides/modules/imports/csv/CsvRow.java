package pe.edu.pucp.hesperides.modules.imports.csv;

import java.util.Map;

/** Una fila del CSV: su número de línea en el archivo y sus celdas por nombre de columna. */
public record CsvRow(int line, Map<String, String> cells) {

    /** La celda, o vacío si la columna no existe en este archivo. */
    public String get(String column) {
        return cells.getOrDefault(column, "");
    }

    public boolean has(String column) {
        return !get(column).isBlank();
    }
}
