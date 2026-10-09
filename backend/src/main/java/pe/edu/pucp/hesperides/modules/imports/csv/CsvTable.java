package pe.edu.pucp.hesperides.modules.imports.csv;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Un CSV del estándar de Hesperides (SPEC-103 §6.1): UTF-8 con o sin BOM,
 * separador punto y coma y comillas dobles. Las filas guardan su número de
 * línea para que cada error diga dónde está.
 */
public record CsvTable(List<String> header, List<CsvRow> rows) {

    private static final char SEPARATOR = ';';
    private static final char QUOTE = '"';

    public static CsvTable parse(byte[] content) {
        String text = new String(content, StandardCharsets.UTF_8);
        if (text.startsWith("﻿")) {
            text = text.substring(1);
        }
        List<Record> records = records(text);
        if (records.isEmpty()) {
            throw new ValidationException("The file is empty");
        }
        List<String> header = records.get(0).cells().stream().map(c -> c.trim().toLowerCase(Locale.ROOT)).toList();
        // Un CSV de Excel en inglés usa comas: con el separador equivocado la cabecera
        // queda en una sola columna y nada encajaría después.
        if (header.size() == 1 && header.get(0).contains(",")) {
            throw new ValidationException("The separator must be a semicolon (;), not a comma");
        }
        List<CsvRow> rows = new ArrayList<>();
        for (Record r : records.subList(1, records.size())) {
            if (r.cells().stream().allMatch(String::isBlank)) {
                continue;
            }
            if (r.cells().size() > header.size()) {
                throw new ValidationException("The row at line " + r.line() + " has more cells than the header");
            }
            Map<String, String> cells = new LinkedHashMap<>();
            for (int i = 0; i < header.size(); i++) {
                cells.put(header.get(i), i < r.cells().size() ? r.cells().get(i).trim() : "");
            }
            rows.add(new CsvRow(r.line(), cells));
        }
        return new CsvTable(header, rows);
    }

    private record Record(int line, List<String> cells) {
    }

    /** Lee carácter a carácter: una celda entre comillas puede tener «;», comillas y saltos de línea. */
    private static List<Record> records(String text) {
        List<Record> out = new ArrayList<>();
        List<String> cells = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        int line = 1, startLine = 1;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (c == QUOTE && i + 1 < text.length() && text.charAt(i + 1) == QUOTE) {
                    cell.append(QUOTE);
                    i++;
                } else if (c == QUOTE) {
                    quoted = false;
                } else {
                    if (c == '\n') line++;
                    cell.append(c);
                }
            } else if (c == QUOTE) {
                quoted = true;
            } else if (c == SEPARATOR) {
                cells.add(cell.toString());
                cell.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') i++;
                cells.add(cell.toString());
                out.add(new Record(startLine, List.copyOf(cells)));
                cells.clear();
                cell.setLength(0);
                line++;
                startLine = line;
            } else {
                cell.append(c);
            }
        }
        if (cell.length() > 0 || !cells.isEmpty()) {
            cells.add(cell.toString());
            out.add(new Record(startLine, List.copyOf(cells)));
        }
        return out;
    }
}
