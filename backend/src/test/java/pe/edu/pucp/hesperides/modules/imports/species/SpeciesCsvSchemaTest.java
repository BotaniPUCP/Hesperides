package pe.edu.pucp.hesperides.modules.imports.species;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesVocabulary.Item;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** El estándar CSV de especies botánicas (SPEC-103 §6.6 y SPEC-105 §5.1). */
class SpeciesCsvSchemaTest {

    private static final SpeciesVocabulary VOCAB = new SpeciesVocabulary(
            List.of(new Item("TREE", "Árbol"), new Item("SHRUB", "Arbusto"), new Item("PALM", "Palmera")),
            List.of(new Item("NATIVE", "Nativa"), new Item("INTRODUCED", "Introducida")),
            List.of(new Item("BOTANICAL_SHEET", "Ficha botánica"),
                    new Item("TEAM_ESTIMATE", "Estimación del equipo"),
                    new Item("CAMPUS_SAMPLE", "Muestra en el campus")));

    private static final String HEADER = String.join(";", SpeciesCsvSchema.COLUMNS);

    private static SpeciesCsvSchema.Parsed parse(String body) {
        return SpeciesCsvSchema.parse(
                CsvTable.parse((HEADER + "\n" + body).getBytes(StandardCharsets.UTF_8)),
                VOCAB);
    }

    @Test
    void aCompleteRowBecomesADraft() {
        var parsed = parse(
                "jacaranda mimosifolia;Jacarandá;Guaranguay|Tarco;bignoniaceae;Arbol;Introducida;"
                        + "Árbol ornamental;Pleno sol;si;12.5;Ficha botanica;4.2;Estimacion del equipo;si;si;jacaranda.jpg\n");

        assertThat(parsed.issues()).isEmpty();
        assertThat(parsed.totalRows()).isEqualTo(1);
        assertThat(parsed.drafts()).singleElement().satisfies(d -> {
            assertThat(d.line()).isEqualTo(2);
            assertThat(d.valid()).isTrue();
            assertThat(d.scientificName()).isEqualTo("Jacaranda mimosifolia");
            assertThat(d.commonName()).isEqualTo("Jacarandá");
            assertThat(d.otherNames()).containsExactly("Guaranguay", "Tarco");
            assertThat(d.family()).isEqualTo("Bignoniaceae");
            assertThat(d.vegetationTypeCode()).isEqualTo("TREE");
            assertThat(d.originCode()).isEqualTo("INTRODUCED");
            assertThat(d.critical()).isTrue();
            assertThat(d.referenceHeightM()).isEqualByComparingTo(new BigDecimal("12.50"));
            assertThat(d.referenceHeightSourceCode()).isEqualTo("BOTANICAL_SHEET");
            assertThat(d.referenceCrownRadiusM()).isEqualByComparingTo(new BigDecimal("4.20"));
            assertThat(d.referenceCrownRadiusSourceCode()).isEqualTo("TEAM_ESTIMATE");
            assertThat(d.usesTrunkHeight()).isTrue();
            assertThat(d.usesDbh()).isTrue();
            assertThat(d.photo()).isEqualTo("jacaranda.jpg");
        });
    }

    @Test
    void scientificNameIsRequiredAndAcceptsOneWordNames() {
        var parsed = parse("Jacaranda;;;;;;;;;;;;;;;\n");

        assertThat(parsed.issues()).isEmpty();
        assertThat(parsed.drafts()).singleElement().satisfies(d ->
                assertThat(d.scientificName()).isEqualTo("Jacaranda"));
    }

    @Test
    void invalidCatalogValueReportsAllowedLabels() {
        var parsed = parse("Jacaranda mimosifolia;;;;Helecho;Marciana;;;;;;;;;;\n");

        assertThat(parsed.issues()).extracting(Issue::column)
                .containsExactlyInAnyOrder("tipo_vegetacion", "origen");
    }

    @Test
    void decimalCommaIsAcceptedAndFlagged() {
        var parsed = parse("Lantana camara;;;;Arbusto;;;;no;\"1,50\";Estimación del equipo;\"0,80\";Estimación del equipo;no;no;\n");

        assertThat(parsed.issues()).isEmpty();
        assertThat(parsed.decimalComma()).isTrue();
        assertThat(parsed.drafts().get(0).referenceHeightM()).isEqualByComparingTo(new BigDecimal("1.50"));
    }

    @Test
    void informativeExportColumnsAreAcceptedAndIgnored() {
        String csv = "nombre_cientifico;tipo_vegetacion;slug;ejemplares\n"
                + "Schinus molle;Árbol;schinus-molle;42\n";
        var parsed = SpeciesCsvSchema.parse(CsvTable.parse(csv.getBytes(StandardCharsets.UTF_8)), VOCAB);

        assertThat(parsed.issues()).isEmpty();
        assertThat(parsed.drafts()).hasSize(1);
    }

    @Test
    void unknownOrRepeatedHeaderColumnAndMissingRequiredColumnAreRejected() {
        var unknown = SpeciesCsvSchema.parse(
                CsvTable.parse("nombre_cientifico;columna_inventada\nSchinus molle;x\n".getBytes(StandardCharsets.UTF_8)),
                VOCAB);
        assertThat(unknown.issues()).extracting(Issue::column).containsExactly("columna_inventada");

        var repeated = SpeciesCsvSchema.parse(
                CsvTable.parse("nombre_cientifico;familia;familia\nSchinus molle;Anacardiaceae;Fabaceae\n".getBytes(StandardCharsets.UTF_8)),
                VOCAB);
        assertThat(repeated.issues()).extracting(Issue::column).containsExactly("familia");

        var missing = SpeciesCsvSchema.parse(
                CsvTable.parse("nombre_comun;tipo_vegetacion\nMolle;Árbol\n".getBytes(StandardCharsets.UTF_8)),
                VOCAB);
        assertThat(missing.issues()).extracting(Issue::column).containsExactly("nombre_cientifico");
    }

    @Test
    void maxLengthNumericBoundsAndBooleanRulesAreEnforcedPerCell() {
        String longText = "x".repeat(2001);
        var parsed = parse("Jacaranda mimosifolia;" + "a".repeat(151) + ";uno|" + "b".repeat(151) + ";Fabaceae123;Árbol;;"
                + longText + ";" + longText + ";quizas;0.001;Ficha botánica;150;Ficha botánica;talvez;2;\n");

        assertThat(parsed.issues()).extracting(Issue::column).containsExactlyInAnyOrder(
                "nombre_comun",
                "nombres_alternativos",
                "familia",
                "descripcion",
                "notas_cuidado",
                "es_critica",
                "altura_promedio_m",
                "radio_copa_promedio_m",
                "usa_altura_fuste",
                "usa_dap");
    }
}
