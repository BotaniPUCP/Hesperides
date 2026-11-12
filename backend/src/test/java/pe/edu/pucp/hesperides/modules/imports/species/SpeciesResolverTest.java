package pe.edu.pucp.hesperides.modules.imports.species;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesPreview;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesImportRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpeciesResolverTest {

    @Mock
    private SpeciesImportRepository repository;

    private SpeciesResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new SpeciesResolver(repository);
        when(repository.existingByKey()).thenReturn(Map.of());
    }

    @Test
    void scientificNamesCollideAfterNfcCaseAndWhitespaceNormalization() {
        var parsed = parsed(
                row(2, "Téstflora   duplicata", null, null),
                row(3, "TÉSTFLORA DUPLICATA", null, null));

        SpeciesPreview preview = resolver.resolve(parsed, Set.of());

        assertThat(preview.rows()).hasSize(1);
        assertThat(preview.issues()).singleElement()
                .satisfies(issue -> assertThat(issue.message()).contains("repeated in the file"));
    }

    @Test
    void multiplicationSignRemainsDistinctFromTheLatinLetterXInIdentityKeys() {
        var parsed = parsed(
                row(2, "CUPRESSOCYPARIS × LEYLANDII", null, null),
                row(3, "CUPRESSOCYPARIS x LEYLANDII", null, null));

        SpeciesPreview preview = resolver.resolve(parsed, Set.of());

        assertThat(preview.issues()).isEmpty();
        assertThat(preview.rows()).hasSize(2);
    }

    @Test
    void measureErrorsIdentifyTheMissingValueOrSource() {
        SpeciesPreview missingHeight = resolver.resolve(parsed(row(2, "Ficus", null, "TEAM_ESTIMATE")), Set.of());
        SpeciesPreview missingHeightSource = resolver.resolve(
                parsed(row(2, "Ficus", new BigDecimal("3.5"), null)), Set.of());
        SpeciesPreview missingCrownRadius = resolver.resolve(
                parsed(row(2, "Ficus", null, null, null, "TEAM_ESTIMATE")), Set.of());
        SpeciesPreview missingCrownRadiusSource = resolver.resolve(
                parsed(row(2, "Ficus", null, null, new BigDecimal("1.2"), null)), Set.of());

        assertThat(missingHeight.issues()).singleElement().satisfies(issue -> {
            assertThat(issue.column()).isEqualTo("altura_promedio_m");
            assertThat(issue.message()).isEqualTo("Indica la altura promedio");
        });
        assertThat(missingHeightSource.issues()).singleElement().satisfies(issue -> {
            assertThat(issue.column()).isEqualTo("fuente_altura");
            assertThat(issue.message()).isEqualTo("Indica la fuente de la altura promedio");
        });
        assertThat(missingCrownRadius.issues()).singleElement().satisfies(issue -> {
            assertThat(issue.column()).isEqualTo("radio_copa_promedio_m");
            assertThat(issue.message()).isEqualTo("Indica el radio de copa promedio");
        });
        assertThat(missingCrownRadiusSource.issues()).singleElement().satisfies(issue -> {
            assertThat(issue.column()).isEqualTo("fuente_radio_copa");
            assertThat(issue.message()).isEqualTo("Indica la fuente del radio de copa promedio");
        });
    }

    private static SpeciesCsvSchema.Parsed parsed(SpeciesDraft... rows) {
        return new SpeciesCsvSchema.Parsed(rows.length, List.of(rows), List.of(), false);
    }

    private static SpeciesDraft row(int line, String name, BigDecimal height, String heightSource) {
        return row(line, name, height, heightSource, null, null);
    }

    private static SpeciesDraft row(int line, String name, BigDecimal height, String heightSource,
                                    BigDecimal crownRadius, String crownSource) {
        return new SpeciesDraft(line, true, name, null, List.of(), null, "TREE", null, null, null,
                true, height, heightSource, crownRadius, crownSource, true, true, null);
    }
}
