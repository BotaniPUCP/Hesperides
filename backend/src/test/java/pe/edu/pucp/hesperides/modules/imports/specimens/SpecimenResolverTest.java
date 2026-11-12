package pe.edu.pucp.hesperides.modules.imports.specimens;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpecimenSnapshot;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesNameIndex;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpecimenSpecies;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpecimenResolverTest {

    @Mock
    private SpecimenLookupRepository lookup;

    @Test
    void previewCarriesTheCurrentAndProposedSpeciesForAnUpdate() {
        SpecimenSpecies incoming = new SpecimenSpecies(2, "schinus-molle", "Schinus molle", null,
                "TREE", true, "species-fingerprint");
        when(lookup.speciesNameIndexForSpecimens()).thenReturn(new SpeciesNameIndex(
                Map.of(SpeciesNameKey.key("Schinus molle"), List.of(incoming)), Map.of(),
                Map.of("schinus-molle", incoming)));
        when(lookup.existingCodes()).thenReturn(Set.of("EV-000001"));
        when(lookup.specimenSnapshots(Set.of("EV-000001")))
                .thenReturn(Map.of("EV-000001", new SpecimenSnapshot("specimen-fingerprint", 1L, "Roystonea regia")));
        when(lookup.registeredPlants()).thenReturn(List.of(
                new Nearby("EV-000001", "roystonea-regia", -12.07, -77.08)));
        when(lookup.nearCampus(-12.07, -77.08, 15.0)).thenReturn(true);

        SpecimenDraft draft = new SpecimenDraft(2, "EV-000001", "Schinus molle", -12.07, -77.08,
                null, null, null, null, null, null, null, null);
        var preview = new SpecimenResolver(lookup).resolve(
                new SpecimenCsvSchema.Parsed(List.of(draft), List.of(), false), Set.of());

        PlannedRow row = preview.rows().getFirst();
        assertThat(row.previousSpeciesId()).isEqualTo(1L);
        assertThat(row.previousSpeciesScientificName()).isEqualTo("Roystonea regia");
        assertThat(row.speciesId()).isEqualTo(2L);
        assertThat(row.speciesScientificName()).isEqualTo("Schinus molle");
    }

    @Test
    void separatesScientificAndAlternativeIndexesAndScopesBindingsToTheExactSourceName() {
        SpecimenSpecies selected = new SpecimenSpecies(2, "cupressocyparis-x-leylandii",
                "Cupressocyparis x leylandii", null, "TREE", true, "species-fingerprint");
        when(lookup.speciesNameIndexForSpecimens()).thenReturn(new SpeciesNameIndex(
                Map.of(SpeciesNameKey.key("Cupressocyparis x leylandii"), List.of(selected)), Map.of(),
                Map.of("cupressocyparis-x-leylandii", selected)));
        when(lookup.existingCodes()).thenReturn(Set.of());
        when(lookup.registeredPlants()).thenReturn(List.of());
        when(lookup.nearCampus(-12.07, -77.08, 15.0)).thenReturn(true);
        SpecimenDraft crossSign = new SpecimenDraft(2, null, "CUPRESSOCYPARIS × LEYLANDII", -12.07, -77.08,
                null, null, null, null, null, null, null, null);
        SpecimenDraft latinX = new SpecimenDraft(3, null, "CUPRESSOCYPARIS x LEYLANDII", -12.07, -77.08,
                null, null, null, null, null, null, null, null);

        var preview = new SpecimenResolver(lookup).resolve(
                new SpecimenCsvSchema.Parsed(List.of(crossSign, latinX), List.of(), false), Set.of(),
                Map.of(SpeciesNameKey.key(latinX.scientificName()), "cupressocyparis-x-leylandii"));

        assertThat(preview.issues()).isEmpty();
        assertThat(preview.rows()).singleElement().satisfies(row -> {
            assertThat(row.speciesSlug()).isEqualTo("cupressocyparis-x-leylandii");
            assertThat(row.resolution()).isEqualTo("USER_SELECTED");
        });
        assertThat(preview.unknownSpecies()).singleElement().satisfies(group -> {
            assertThat(group.name()).isEqualTo("CUPRESSOCYPARIS × LEYLANDII");
            assertThat(group.sourceKey()).isEqualTo(SpeciesNameKey.key(crossSign.scientificName()));
        });
    }

    @Test
    void csvKeepsTheMultiplicationSignSeparateFromTheLatinXWhenGroupingUnresolvedSpecies() {
        var parsed = SpecimenCsvSchema.parse(CsvTable.parse(("""
                nombre_cientifico;latitud;longitud
                Quercus × alba;-12.07;-77.08
                Quercus x alba;-12.071;-77.081
                """).getBytes(StandardCharsets.UTF_8)));
        when(lookup.speciesNameIndexForSpecimens()).thenReturn(new SpeciesNameIndex(Map.of(), Map.of(), Map.of()));
        when(lookup.existingCodes()).thenReturn(Set.of());
        when(lookup.registeredPlants()).thenReturn(List.of());
        when(lookup.nearCampus(-12.07, -77.08, 15.0)).thenReturn(true);
        when(lookup.nearCampus(-12.071, -77.081, 15.0)).thenReturn(true);

        var preview = new SpecimenResolver(lookup).resolve(parsed, Set.of());

        assertThat(parsed.issues()).isEmpty();
        assertThat(preview.unknownSpecies()).hasSize(2);
        assertThat(preview.unknownSpecies()).extracting(SpecimenPreview.SpeciesCount::name)
                .containsExactly("Quercus × alba", "Quercus x alba");
        assertThat(preview.unknownSpecies()).extracting(SpecimenPreview.SpeciesCount::sourceKey)
                .containsExactly(SpeciesNameKey.key("Quercus × alba"), SpeciesNameKey.key("Quercus x alba"));
    }

    @Test
    void exactScientificNameKeepsPriorityWhenTheSameKeyAlsoExistsAsAnAlternative() {
        SpecimenSpecies scientific = new SpecimenSpecies(1, "scientific", "Mango", null,
                "TREE", true, "scientific-fingerprint");
        SpecimenSpecies alternativeOwner = new SpecimenSpecies(2, "alternative-owner", "Manguifera indica", null,
                "TREE", true, "alternative-fingerprint");
        String key = SpeciesNameKey.key("Mango");
        when(lookup.speciesNameIndexForSpecimens()).thenReturn(new SpeciesNameIndex(
                Map.of(key, List.of(scientific)), Map.of(key, List.of(alternativeOwner)),
                Map.of("scientific", scientific, "alternative-owner", alternativeOwner)));
        when(lookup.existingCodes()).thenReturn(Set.of());
        when(lookup.registeredPlants()).thenReturn(List.of());
        when(lookup.nearCampus(-12.07, -77.08, 15.0)).thenReturn(true);

        var preview = resolveNew("Mango");

        assertThat(preview.rows()).singleElement().satisfies(row -> {
            assertThat(row.speciesId()).isEqualTo(1L);
            assertThat(row.resolution()).isEqualTo("SCIENTIFIC_NAME");
        });
    }

    @Test
    void alternativeNamesUseTheCommonKeyWithoutScientificNameValidation() {
        SpecimenSpecies alternative = new SpecimenSpecies(3, "molle-alias", "Schinus molle", null,
                "TREE", true, "species-fingerprint");
        String alias = "O’Árbol × especial";
        when(lookup.speciesNameIndexForSpecimens()).thenReturn(new SpeciesNameIndex(
                Map.of(), Map.of(SpeciesNameKey.key(alias), List.of(alternative)),
                Map.of("molle-alias", alternative)));
        when(lookup.existingCodes()).thenReturn(Set.of());
        when(lookup.registeredPlants()).thenReturn(List.of());
        when(lookup.nearCampus(-12.07, -77.08, 15.0)).thenReturn(true);

        var exactAlias = resolveNew(alias);
        var latinX = resolveNew("O’Árbol x especial");

        assertThat(exactAlias.rows()).singleElement().satisfies(row -> {
            assertThat(row.speciesId()).isEqualTo(3L);
            assertThat(row.resolution()).isEqualTo("ALTERNATIVE_NAME");
        });
        assertThat(latinX.rows()).isEmpty();
        assertThat(latinX.unknownSpecies()).singleElement()
                .satisfies(group -> assertThat(group.name()).isEqualTo("O’Árbol x especial"));
    }

    @Test
    void ambiguousAlternativeDoesNotResolveButAnIndependentScientificNameInTheSameCsvDoes() {
        SpecimenSpecies schinus = new SpecimenSpecies(1, "schinus-molle", "Schinus molle", "Molle",
                "TREE", true, "schinus-fingerprint");
        SpecimenSpecies tipuana = new SpecimenSpecies(2, "tipuana-tipu", "Tipuana tipu", "Tipa",
                "TREE", true, "tipuana-fingerprint");
        String alias = "Alias ambiguo prueba";
        String aliasKey = SpeciesNameKey.key(alias);
        String schinusKey = SpeciesNameKey.key(schinus.scientificName());
        var parsed = SpecimenCsvSchema.parse(CsvTable.parse(("""
                nombre_cientifico;latitud;longitud
                Alias ambiguo prueba;-12.07;-77.08
                Schinus molle;-12.071;-77.081
                """).getBytes(StandardCharsets.UTF_8)));
        when(lookup.speciesNameIndexForSpecimens()).thenReturn(new SpeciesNameIndex(
                Map.of(schinusKey, List.of(schinus)),
                Map.of(aliasKey, List.of(schinus, tipuana)),
                Map.of(schinus.slug(), schinus, tipuana.slug(), tipuana)));
        when(lookup.existingCodes()).thenReturn(Set.of());
        when(lookup.registeredPlants()).thenReturn(List.of());
        when(lookup.nearCampus(-12.07, -77.08, 15.0)).thenReturn(true);
        when(lookup.nearCampus(-12.071, -77.081, 15.0)).thenReturn(true);

        var preview = new SpecimenResolver(lookup).resolve(parsed, Set.of());

        assertThat(parsed.issues()).isEmpty();
        assertThat(preview.unknownSpecies()).singleElement().satisfies(group -> {
            assertThat(group.name()).isEqualTo(alias);
            assertThat(group.sourceKey()).isEqualTo(aliasKey);
            assertThat(group.rows()).isEqualTo(1);
            assertThat(group.reason()).isEqualTo("AMBIGUOUS");
        });
        assertThat(preview.rows()).singleElement().satisfies(row -> {
            assertThat(row.speciesId()).isEqualTo(schinus.id());
            assertThat(row.speciesSlug()).isEqualTo(schinus.slug());
            assertThat(row.speciesScientificName()).isEqualTo(schinus.scientificName());
            assertThat(row.resolution()).isEqualTo("SCIENTIFIC_NAME");
        });
        assertThat(preview.speciesBindings()).isEmpty();
        assertThat(preview.speciesBindingSummary()).singleElement()
                .satisfies(binding -> assertThat(binding.sourceKey()).isEqualTo(schinusKey));
        assertThat(preview.canConfirm()).isTrue();
    }

    @Test
    void rejectsAConfirmationWhenANewNearbyPlantInvalidatesThePreviewPlan() {
        SpecimenDraft draft = new SpecimenDraft(2, null, "Schinus molle", -12.07, -77.08,
                null, null, null, null, null, null, null, null);
        PlannedRow planned = new PlannedRow(draft, ImportAction.CREATE, 1L, "schinus-molle", "Schinus molle",
                true, "TREE", "species-fingerprint", null, "SCIENTIFIC_NAME", null, null, null, null);
        when(lookup.registeredPlants()).thenReturn(List.of(
                new Nearby("EV-000999", "schinus-molle", -12.07, -77.08)));

        assertThatThrownBy(() -> new SpecimenResolver(lookup).verifyDuplicatePlanCurrent(List.of(planned)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Nearby plants changed after the preview");
    }

    private SpecimenPreview resolveNew(String name) {
        SpecimenDraft draft = new SpecimenDraft(2, null, name, -12.07, -77.08,
                null, null, null, null, null, null, null, null);
        return new SpecimenResolver(lookup).resolve(
                new SpecimenCsvSchema.Parsed(List.of(draft), List.of(), false), Set.of());
    }
}
