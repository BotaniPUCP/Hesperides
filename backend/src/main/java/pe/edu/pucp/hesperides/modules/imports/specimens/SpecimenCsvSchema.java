package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.modules.imports.csv.Cells;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * El estándar de ejemplares (SPEC-103 §6.2): qué columnas existen, cuáles son
 * obligatorias y cómo se lee cada celda. No consulta la base: lo que depende
 * de ella se resuelve en la vista previa.
 */
public final class SpecimenCsvSchema {

    public static final List<String> REQUIRED = List.of("nombre_cientifico", "latitud", "longitud");
    public static final List<String> MEASUREMENT = List.of("altura_m", "altura_fuste_m", "dap_cm", "radio_copa_m", "zunchado");
    public static final List<String> ASSESSMENT = List.of("enfermedades", "plagas", "danos_mecanicos", "inclinacion",
            "ramas_secas", "cavidades", "raices_expuestas", "interferencia", "manejo_recomendado", "observacion_evaluacion");
    /** Se exportan para leer el archivo y se ignoran al cargarlo. */
    public static final Set<String> INFORMATIVE = Set.of("nombre_comun", "nombres_alternativos", "familia",
            "tipo_vegetacion", "tipo_elemento", "origen_medidas");
    public static final List<String> COLUMNS = columns();
    /** El orden del archivo exportado: el estándar y, al final, las informativas. */
    public static final List<String> EXPORT_COLUMNS = exportColumns();

    /** Un problema con su fila (1 = cabecera) y su columna. */
    public record Issue(int line, String column, String message) {
    }

    public record Parsed(List<SpecimenDraft> drafts, List<Issue> issues, boolean decimalComma) {
    }

    private SpecimenCsvSchema() {
    }

    private static List<String> columns() {
        List<String> all = new ArrayList<>(List.of("codigo", "nombre_cientifico", "latitud", "longitud", "cantidad",
                "referencia_catastro", "placa_antigua", "ubicacion_catastro", "fecha_medicion"));
        all.addAll(MEASUREMENT);
        all.add("fecha_evaluacion");
        all.addAll(ASSESSMENT);
        all.addAll(List.of("foto", "observaciones"));
        return List.copyOf(all);
    }

    private static List<String> exportColumns() {
        List<String> all = new ArrayList<>(COLUMNS);
        all.addAll(List.of("nombre_comun", "nombres_alternativos", "familia", "tipo_vegetacion", "tipo_elemento",
                "origen_medidas"));
        return List.copyOf(all);
    }

    public static Parsed parse(CsvTable table) {
        List<Issue> issues = new ArrayList<>(headerIssues(table.header()));
        if (!issues.isEmpty()) {
            return new Parsed(List.of(), issues, false);
        }
        List<SpecimenDraft> drafts = new ArrayList<>();
        boolean comma = false;
        for (CsvRow row : table.rows()) {
            RowReader r = new RowReader(row, issues);
            comma |= Cells.usesDecimalComma(row.get("latitud")) || Cells.usesDecimalComma(row.get("longitud"));
            SpecimenDraft draft = SpecimenRowReader.read(r);
            if (r.ok()) {
                drafts.add(draft);
            }
        }
        return new Parsed(drafts, issues, comma);
    }

    private static List<Issue> headerIssues(List<String> header) {
        List<Issue> issues = new ArrayList<>();
        for (String column : header) {
            if (!COLUMNS.contains(column) && !INFORMATIVE.contains(column)) {
                issues.add(new Issue(1, column, "Unknown column. Check the spelling against the standard"));
            }
        }
        for (String column : REQUIRED) {
            if (!header.contains(column)) {
                issues.add(new Issue(1, column, "Required column is missing"));
            }
        }
        return issues;
    }

    /** Lee celdas de una fila y acumula sus errores sin detenerse en el primero. */
    static final class RowReader {
        private final CsvRow row;
        private final List<Issue> issues;
        private boolean ok = true;

        RowReader(CsvRow row, List<Issue> issues) {
            this.row = row;
            this.issues = issues;
        }

        CsvRow row() {
            return row;
        }

        boolean ok() {
            return ok;
        }

        String text(String column) {
            String v = row.get(column);
            return v.isBlank() ? null : v;
        }

        String required(String column) {
            String v = text(column);
            if (v == null) {
                fail(column, "Required value is empty");
            }
            return v;
        }

        <T> T read(String column, Function<String, T> parser) {
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

        void fail(String column, String message) {
            ok = false;
            issues.add(new Issue(row.line(), column, message));
        }
    }
}
