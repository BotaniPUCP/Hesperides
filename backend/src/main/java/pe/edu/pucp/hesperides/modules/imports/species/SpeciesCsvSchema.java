package pe.edu.pucp.hesperides.modules.imports.species;

import pe.edu.pucp.hesperides.modules.imports.csv.Cells;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.RowReader;
import pe.edu.pucp.hesperides.modules.inventory.service.SpeciesRegistrationService;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * El estándar de especies botánicas (SPEC-103 §6.6 y SPEC-105 §5.1): qué columnas
 * existen, cuáles son obligatorias y cómo se lee cada celda.
 */
public final class SpeciesCsvSchema {

    public static final List<String> REQUIRED = List.of("nombre_cientifico");
    public static final List<String> COLUMNS = List.of(
            "nombre_cientifico", "nombre_comun", "nombres_alternativos", "familia",
            "tipo_vegetacion", "origen", "descripcion", "notas_cuidado",
            "es_critica", "altura_promedio_m", "fuente_altura",
            "radio_copa_promedio_m", "fuente_radio_copa",
            "usa_altura_fuste", "usa_dap", "foto");
    /** Se exportan para leer el archivo y se ignoran al cargarlo. */
    public static final Set<String> INFORMATIVE = Set.of("slug", "ejemplares");
    /** El orden del archivo exportado: el estándar y, al final, las informativas. */
    public static final List<String> EXPORT_COLUMNS = exportColumns();

    private static final String LIST_SEPARATOR = "\\|";

    public record Parsed(int totalRows, List<SpeciesDraft> drafts, List<Issue> issues, boolean decimalComma) {
    }

    private SpeciesCsvSchema() {
    }

    private static List<String> exportColumns() {
        List<String> all = new ArrayList<>(COLUMNS);
        all.addAll(List.of("slug", "ejemplares"));
        return List.copyOf(all);
    }

    public static Parsed parse(CsvTable table, SpeciesVocabulary vocab) {
        List<Issue> issues = new ArrayList<>(headerIssues(table.header()));
        if (!issues.isEmpty()) {
            return new Parsed(table.rows().size(), List.of(), issues, false);
        }
        List<SpeciesDraft> drafts = new ArrayList<>();
        boolean comma = false;
        for (CsvRow row : table.rows()) {
            comma |= Cells.usesDecimalComma(row.get("altura_promedio_m"))
                    || Cells.usesDecimalComma(row.get("radio_copa_promedio_m"));
            RowReader r = new RowReader(row, issues);
            drafts.add(read(r, vocab));
        }
        return new Parsed(table.rows().size(), drafts, issues, comma);
    }

    private static SpeciesDraft read(RowReader r, SpeciesVocabulary vocab) {
        String rawName = r.required("nombre_cientifico");
        String scientificName = null;
        if (rawName != null) {
            try {
                scientificName = SpeciesRegistrationService.normalizeScientificName(rawName);
            } catch (ValidationException e) {
                r.fail("nombre_cientifico", e.getMessage());
            }
        }
        String commonName = r.read("nombre_comun", s -> Cells.maxLength(s, 150));
        List<String> otherNames = r.read("nombres_alternativos", SpeciesCsvSchema::otherNames);
        String family = r.read("familia", SpeciesCsvSchema::family);
        String vegetationType = listed(r, "tipo_vegetacion", vocab);
        String origin = listed(r, "origen", vocab);
        String description = r.read("descripcion", s -> Cells.maxLength(s, 2000));
        String careNotes = r.read("notas_cuidado", s -> Cells.maxLength(s, 2000));
        Boolean critical = r.read("es_critica", Cells::yesNo);
        BigDecimal heightM = r.read("altura_promedio_m", s -> positiveDimension(s, 200));
        String heightSource = listed(r, "fuente_altura", vocab);
        BigDecimal crownRadiusM = r.read("radio_copa_promedio_m", s -> positiveDimension(s, 100));
        String crownSource = listed(r, "fuente_radio_copa", vocab);
        Boolean usesTrunkHeight = r.read("usa_altura_fuste", Cells::yesNo);
        Boolean usesDbh = r.read("usa_dap", Cells::yesNo);
        String photo = r.text("foto");
        return new SpeciesDraft(r.row().line(), r.ok(), scientificName, commonName, otherNames, family,
                vegetationType, origin, description, careNotes, critical,
                heightM, heightSource, crownRadiusM, crownSource,
                usesTrunkHeight, usesDbh, photo);
    }

    private static BigDecimal positiveDimension(String text, double maxExclusive) {
        double raw = Cells.positiveDecimal(text, maxExclusive);
        BigDecimal scaled = BigDecimal.valueOf(raw).setScale(2, RoundingMode.HALF_UP);
        if (scaled.compareTo(BigDecimal.ZERO) <= 0) {
            throw new Cells.CellException("must be at least 0.01");
        }
        if (scaled.compareTo(BigDecimal.valueOf(maxExclusive)) >= 0) {
            throw new Cells.CellException("must be less than " + (int) maxExclusive);
        }
        return scaled;
    }

    private static String family(String raw) {
        String trimmed = Cells.maxLength(raw, 100);
        if (trimmed.chars().anyMatch(Character::isDigit)) {
            throw new Cells.CellException("Family name cannot contain numbers");
        }
        return trimmed.substring(0, 1).toUpperCase(Locale.ROOT) + trimmed.substring(1);
    }

    private static String listed(RowReader r, String column, SpeciesVocabulary vocab) {
        String value = r.text(column);
        if (value == null) {
            return null;
        }
        var resolved = vocab.resolve(column, value);
        if (resolved.isEmpty()) {
            r.fail(column, "«" + value.trim() + "» is not a valid value. Use: " + vocab.allowed(column));
            return null;
        }
        return resolved.get();
    }

    private static List<String> otherNames(String raw) {
        return Arrays.stream(raw.split(LIST_SEPARATOR))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> Cells.maxLength(s, 150))
                .distinct()
                .toList();
    }

    private static List<Issue> headerIssues(List<String> header) {
        List<Issue> issues = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String column : header) {
            if (!seen.add(column)) {
                issues.add(new Issue(1, column, "Repeated column in the header"));
                continue;
            }
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
}
