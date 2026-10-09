package pe.edu.pucp.hesperides.modules.imports.csv;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Escribe un CSV en el formato de los estándares (SPEC-103 §6.1): UTF-8, punto
 * y coma, y comillas solo donde una celda las necesita. Es lo que
 * {@link CsvTable} lee, así que un archivo exportado se puede volver a cargar.
 */
public final class CsvWriter {

    private static final char SEPARATOR = ';';
    /** Excel abre como UTF-8 un archivo con BOM; sin él, rompe las tildes. */
    private static final String BOM = "﻿";

    private CsvWriter() {
    }

    public static byte[] write(List<String> columns, List<Map<String, String>> rows) {
        StringBuilder out = new StringBuilder(BOM).append(line(columns));
        for (Map<String, String> row : rows) {
            out.append(line(columns.stream().map(c -> row.getOrDefault(c, "")).toList()));
        }
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String line(List<String> cells) {
        return cells.stream().map(CsvWriter::cell).collect(Collectors.joining(String.valueOf(SEPARATOR))) + "\n";
    }

    static String cell(String value) {
        if (value == null) {
            return "";
        }
        boolean needsQuotes = value.indexOf(SEPARATOR) >= 0 || value.indexOf('"') >= 0
                || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0;
        return needsQuotes ? '"' + value.replace("\"", "\"\"") + '"' : value;
    }
}
