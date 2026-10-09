package pe.edu.pucp.hesperides.modules.imports.features;

import pe.edu.pucp.hesperides.modules.imports.csv.Cells;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.RowReader;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Los estándares de tachos y bebederos (SPEC-103 §6.3 y §6.4): qué columnas
 * existen y cómo se lee cada celda. Las columnas con lista se validan contra
 * su catálogo; un valor fuera de la lista es un error de formato.
 */
public final class FeatureCsvSchema {

    private static final String LIST_SEPARATOR = "\\|";

    public record Parsed(List<FeatureDraft> drafts, List<Issue> issues, boolean decimalComma) {
    }

    private FeatureCsvSchema() {
    }

    public static Parsed parse(CsvTable table, FeatureKind kind, FeatureVocabulary vocab) {
        List<Issue> issues = new ArrayList<>(headerIssues(table.header(), kind));
        if (!issues.isEmpty()) {
            return new Parsed(List.of(), issues, false);
        }
        List<FeatureDraft> drafts = new ArrayList<>();
        boolean comma = false;
        for (CsvRow row : table.rows()) {
            comma |= Cells.usesDecimalComma(row.get("latitud")) || Cells.usesDecimalComma(row.get("longitud"));
            FeatureDraft d = read(new RowReader(row, issues), kind, vocab);
            if (d != null) {
                drafts.add(d);
            }
        }
        return new Parsed(drafts, issues, comma);
    }

    /** Una fila del estándar; también la usa el formulario. Null si tuvo errores (ya anotados). */
    public static FeatureDraft read(RowReader r, FeatureKind kind, FeatureVocabulary vocab) {
        String lat = r.required("latitud");
        String lon = r.required("longitud");
        Double latitude = lat == null ? null : r.read("latitud", Cells::decimal);
        Double longitude = lon == null ? null : r.read("longitud", Cells::decimal);
        Map<String, Object> attributes = new LinkedHashMap<>();
        for (String column : kind.attributeColumns()) {
            String value = r.text(column);
            if (value != null) {
                Object read = vocab.governs(column) ? listed(r, column, value, vocab) : value.trim();
                if (read != null) attributes.put(column, read);
            }
        }
        if (!r.ok()) {
            return null;
        }
        return new FeatureDraft(r.row().line(), r.text("codigo"), latitude, longitude, r.text("lugar"),
                attributes, r.text("foto"));
    }

    /** Los residuos son varios, separados por «|»; el tipo y el estado, uno. */
    private static Object listed(RowReader r, String column, String value, FeatureVocabulary vocab) {
        List<String> values = column.equals("residuos")
                ? Arrays.stream(value.split(LIST_SEPARATOR)).map(String::trim).filter(v -> !v.isEmpty()).toList()
                : List.of(value.trim());
        List<String> stored = new ArrayList<>();
        for (String v : values) {
            var resolved = vocab.resolve(column, v);
            if (resolved.isEmpty()) {
                r.fail(column, "«" + v + "» is not a valid value. Use: " + vocab.allowed(column));
                return null;
            }
            stored.add(resolved.get());
        }
        return column.equals("residuos") ? stored : stored.get(0);
    }

    private static List<Issue> headerIssues(List<String> header, FeatureKind kind) {
        List<Issue> issues = new ArrayList<>();
        for (String column : header) {
            if (!kind.columns().contains(column)) {
                issues.add(new Issue(1, column, "Unknown column. Check the spelling against the standard"));
            }
        }
        for (String column : List.of("latitud", "longitud")) {
            if (!header.contains(column)) {
                issues.add(new Issue(1, column, "Required column is missing"));
            }
        }
        return issues;
    }
}
