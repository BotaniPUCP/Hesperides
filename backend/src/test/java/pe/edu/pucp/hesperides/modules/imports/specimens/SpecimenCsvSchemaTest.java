package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** El estándar de ejemplares (SPEC-103 §6.2). */
class SpecimenCsvSchemaTest {

    private static final String HEADER = "codigo;nombre_cientifico;latitud;longitud;cantidad;fecha_medicion;altura_m;"
            + "fecha_evaluacion;ramas_secas;manejo_recomendado;foto";

    private static SpecimenCsvSchema.Parsed parse(String body) {
        return SpecimenCsvSchema.parse(CsvTable.parse((HEADER + "\n" + body).getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void aCompleteRowBecomesADraft() {
        var parsed = parse(";Roystonea regia;-12.067;-77.079;1;2026-03-01;7.5;2026-03-02;si;Sin intervención;p01.jpg\n");

        assertThat(parsed.issues()).isEmpty();
        SpecimenDraft d = parsed.drafts().get(0);
        assertThat(d.line()).isEqualTo(2);
        assertThat(d.code()).isNull();
        assertThat(d.scientificName()).isEqualTo("Roystonea regia");
        assertThat(d.measurement().date()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(d.measurement().heightM()).isEqualTo(7.5);
        assertThat(d.assessment().hasDeadBranches()).isTrue();
        assertThat(d.assessment().recommendedManagement()).isEqualTo("Sin intervención");
        assertThat(d.photo()).isEqualTo("p01.jpg");
    }

    @Test
    void aRowWithoutMeasuresOrAssessmentHasNeither() {
        SpecimenDraft d = parse(";Tipuana tipu;-12.07;-77.08;;;;;;;\n").drafts().get(0);

        assertThat(d.measurement()).isNull();
        assertThat(d.assessment()).isNull();
        assertThat(d.quantity()).isEqualTo(1);
    }

    @Test
    void requiredCellsMustBePresent() {
        var parsed = parse(";;;-77.08;;;;;;;\n");

        assertThat(parsed.issues()).extracting(Issue::column)
                .contains("nombre_cientifico", "latitud");
        assertThat(parsed.issues()).allSatisfy(i -> assertThat(i.line()).isEqualTo(2));
    }

    @Test
    void aMeasureNeedsItsDate() {
        // La fecha decide cuál medida es la vigente (SPEC-103 §5.3).
        var parsed = parse(";Roystonea regia;-12.067;-77.079;;;7.5;;;;\n");

        assertThat(parsed.issues()).extracting(Issue::column).containsExactly("fecha_medicion");
    }

    @Test
    void anAssessmentNeedsItsDate() {
        var parsed = parse(";Roystonea regia;-12.067;-77.079;;;;;si;;\n");

        assertThat(parsed.issues()).extracting(Issue::column).containsExactly("fecha_evaluacion");
    }

    @Test
    void badValuesAreReportedPerCell() {
        var parsed = parse(";Roystonea regia;norte;-77.079;0;ayer;;;quizas;;\n");

        assertThat(parsed.issues()).extracting(Issue::column)
                .contains("latitud", "cantidad", "fecha_medicion", "ramas_secas");
    }

    @Test
    void aDecimalCommaIsAcceptedAndFlagged() {
        var parsed = parse(";Roystonea regia;\"-12,067\";\"-77,079\";;;;;;;\n");

        assertThat(parsed.issues()).isEmpty();
        assertThat(parsed.decimalComma()).isTrue();
        assertThat(parsed.drafts().get(0).lat()).isEqualTo(-12.067);
    }

    @Test
    void anUnknownColumnIsAFormatError() {
        // Un error de tipeo en la cabecera no puede hacer perder datos en silencio.
        var parsed = SpecimenCsvSchema.parse(CsvTable.parse(
                "nombre_cientifico;latitud;longitud;altura\nRoystonea regia;-12;-77;7\n".getBytes(StandardCharsets.UTF_8)));

        assertThat(parsed.issues()).singleElement().satisfies(i -> {
            assertThat(i.line()).isEqualTo(1);
            assertThat(i.column()).isEqualTo("altura");
        });
    }

    @Test
    void aMissingRequiredColumnIsAFormatError() {
        var parsed = SpecimenCsvSchema.parse(CsvTable.parse("nombre_cientifico;latitud\nRoystonea regia;-12\n".getBytes(StandardCharsets.UTF_8)));

        assertThat(parsed.issues()).extracting(Issue::column).contains("longitud");
    }

    @Test
    void informativeColumnsOfAnExportAreAcceptedAndIgnored() {
        var parsed = SpecimenCsvSchema.parse(CsvTable.parse(
                "nombre_cientifico;latitud;longitud;familia;origen_medidas\nRoystonea regia;-12;-77;Arecaceae;Medido\n"
                        .getBytes(StandardCharsets.UTF_8)));

        assertThat(parsed.issues()).isEmpty();
    }
}
