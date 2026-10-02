package pe.edu.pucp.hesperides.modules.imports.speciesphotos;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesRef;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** El estándar de fotos de especie con orden y créditos (SPEC-104 D-01, D-04). */
class SpeciesPhotoPreviewTest {

    private static final Map<String, SpeciesRef> SPECIES = Map.of(
            "schinus molle", new SpeciesRef(1L, "schinus-molle", "Schinus molle", "TREE"),
            "tipuana tipu", new SpeciesRef(2L, "tipuana-tipu", "Tipuana tipu", "TREE"));
    private static final Set<String> FILES = Set.of("a.jpg", "b.jpg", "c.jpg");

    private static SpeciesPhotoPreview preview(String csv) {
        return SpeciesPhotoPreview.of(CsvTable.parse(csv.getBytes(StandardCharsets.UTF_8)), SPECIES, FILES);
    }

    @Test
    void theOldTwoColumnFileStillWorks() {
        SpeciesPhotoPreview p = preview("nombre_cientifico;foto\nSchinus molle;a.jpg\n");

        assertThat(p.issues()).isEmpty();
        assertThat(p.rows()).singleElement().satisfies(r -> {
            assertThat(r.order()).isNull();
            assertThat(r.author()).isNull();
        });
    }

    @Test
    void creditsAndOrderAreRead() {
        SpeciesPhotoPreview p = preview("""
                nombre_cientifico;foto;orden;autor;licencia;fuente
                Schinus molle;a.jpg;2;Ana Pérez;CC BY-SA 4.0;https://commons.wikimedia.org/wiki/File:A.jpg
                """);

        assertThat(p.issues()).isEmpty();
        SpeciesPhotoPreview.Planned row = p.rows().get(0);
        assertThat(row.order()).isEqualTo(2);
        assertThat(row.author()).isEqualTo("Ana Pérez");
        assertThat(row.license()).isEqualTo("CC BY-SA 4.0");
        assertThat(row.sourcePage()).isEqualTo("https://commons.wikimedia.org/wiki/File:A.jpg");
    }

    @Test
    void theOrderMustBeAPositiveWholeNumber() {
        SpeciesPhotoPreview p = preview("nombre_cientifico;foto;orden\nSchinus molle;a.jpg;0\nTipuana tipu;b.jpg;dos\n");

        assertThat(p.issues()).extracting(Issue::column).containsExactly("orden", "orden");
    }

    @Test
    void twoPhotosOfASpeciesCannotShareTheirOrder() {
        SpeciesPhotoPreview p = preview("nombre_cientifico;foto;orden\nSchinus molle;a.jpg;1\nSchinus molle;b.jpg;1\n");

        assertThat(p.issues()).singleElement().satisfies(i -> {
            assertThat(i.line()).isEqualTo(3);
            assertThat(i.column()).isEqualTo("orden");
        });
    }

    @Test
    void theSourceMustBeAWebLink() {
        SpeciesPhotoPreview p = preview("nombre_cientifico;foto;fuente\nSchinus molle;a.jpg;wikimedia\n");

        assertThat(p.issues()).extracting(Issue::column).containsExactly("fuente");
    }

    @Test
    void theRowsOfASpeciesAreGroupedInTheirOrder() {
        SpeciesPhotoPreview p = preview("""
                nombre_cientifico;foto;orden
                Schinus molle;a.jpg;2
                Tipuana tipu;c.jpg;
                Schinus molle;b.jpg;1
                """);

        Map<Long, List<SpeciesPhotoPreview.Planned>> sets = p.sets();
        assertThat(sets.get(1L)).extracting(SpeciesPhotoPreview.Planned::photo).containsExactly("b.jpg", "a.jpg");
        assertThat(sets.get(2L)).extracting(SpeciesPhotoPreview.Planned::photo).containsExactly("c.jpg");
    }
}
