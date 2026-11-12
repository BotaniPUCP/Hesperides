package pe.edu.pucp.hesperides.modules.imports.specimens;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SpecimenBindingKeyCompatibilityTest {

    @Test
    void currentPreviewSelectionsRemainScopedToTheirCanonicalSourceKey() {
        String xKey = SpeciesNameKey.key("Quercus x alba");
        String multiplicationKey = SpeciesNameKey.key("Quercus × alba");
        SpecimenPreview current = new SpecimenPreview(2, false, List.of(), List.of(
                new SpecimenPreview.SpeciesCount("Quercus x alba", 1, xKey, "NOT_FOUND"),
                new SpecimenPreview.SpeciesCount("Quercus × alba", 1, multiplicationKey, "NOT_FOUND")),
                List.of(), Map.of(), List.of(), SpecimenPreview.CURRENT_BINDING_KEY_VERSION);

        Map<String, String> recovered = SpecimenBindingKeyCompatibility.recover(
                current, List.of(draft("Quercus x alba"), draft("Quercus × alba")), Map.of(xKey, "x-species"));

        assertThat(recovered).containsExactlyEntriesOf(Map.of(xKey, "x-species"));
    }

    @Test
    void recognizesUnversionedPreviewsThatAlreadyStoredCanonicalGroupKeys() {
        String xKey = SpeciesNameKey.key("Quercus x alba");
        String multiplicationKey = SpeciesNameKey.key("Quercus × alba");
        SpecimenPreview unversioned = new SpecimenPreview(2, false, List.of(), List.of(
                new SpecimenPreview.SpeciesCount("Quercus x alba", 1, xKey, "NOT_FOUND"),
                new SpecimenPreview.SpeciesCount("Quercus × alba", 1, multiplicationKey, "NOT_FOUND")),
                List.of(), Map.of(), List.of(), null);

        Map<String, String> recovered = SpecimenBindingKeyCompatibility.recover(
                unversioned, List.of(draft("Quercus x alba"), draft("Quercus × alba")), Map.of(xKey, "x-species"));

        assertThat(recovered).containsExactlyEntriesOf(Map.of(xKey, "x-species"));
    }

    @Test
    void recoversAnOldSelectionOnlyWhenItsOriginalGroupMapsUniquely() {
        String oldKey = "ficus sp";
        SpecimenPreview old = legacyPreview(
                new SpecimenPreview.SpeciesCount("Ficus sp.", 1, oldKey, "USER_UNRESOLVED"));

        Map<String, String> recovered = SpecimenBindingKeyCompatibility.recover(
                old, List.of(draft("Ficus sp.")), Map.of(oldKey, "ficus-sp"));

        assertThat(recovered).containsExactlyEntriesOf(Map.of(SpeciesNameKey.key("Ficus sp."), "ficus-sp"));
    }

    @Test
    void recoversAPreviouslyResolvedOldGroupFromItsStoredSourceName() {
        String oldKey = "ficus sp";
        SpecimenPreview old = new SpecimenPreview(1, false, List.of(), List.of(), List.of(),
                Map.of(oldKey, "ficus-sp"),
                List.of(new SpecimenPreview.SpeciesBinding(oldKey, "Ficus sp.", 1, "ficus-sp",
                        "Ficus sp.", true, "USER_SELECTED")), null);

        Map<String, String> recovered = SpecimenBindingKeyCompatibility.recover(
                old, List.of(draft("Ficus sp.")), Map.of(oldKey, "ficus-sp"));

        assertThat(recovered).containsExactlyEntriesOf(Map.of(SpeciesNameKey.key("Ficus sp."), "ficus-sp"));
    }

    @Test
    void doesNotTransferAnOldSelectionWhenTheOldKeyCoveredDifferentNewGroups() {
        String oldKey = "quercus x alba";
        SpecimenPreview old = legacyPreview(
                new SpecimenPreview.SpeciesCount("Quercus x alba", 2, oldKey, "USER_UNRESOLVED"));

        Map<String, String> recovered = SpecimenBindingKeyCompatibility.recover(old,
                List.of(draft("Quercus x alba"), draft("Quercus × alba")), Map.of(oldKey, "old-selection"));

        assertThat(recovered).containsExactlyInAnyOrderEntriesOf(Map.of(
                SpeciesNameKey.key("Quercus x alba"), "",
                SpeciesNameKey.key("Quercus × alba"), ""));
    }

    @Test
    void withoutAStoredGroupDoesNotGuessWhichPossibleGroupWasSelected() {
        String oldKey = "quercus x alba";

        Map<String, String> recovered = SpecimenBindingKeyCompatibility.recover(null,
                List.of(draft("Quercus x alba"), draft("Quercus × alba")), Map.of(oldKey, "old-selection"));

        assertThat(recovered).containsExactlyInAnyOrderEntriesOf(Map.of(
                SpeciesNameKey.key("Quercus x alba"), "",
                SpeciesNameKey.key("Quercus × alba"), ""));
    }

    private static SpecimenPreview legacyPreview(SpecimenPreview.SpeciesCount unknown) {
        return new SpecimenPreview(unknown.rows(), false, List.of(), List.of(unknown), List.of(),
                Map.of(unknown.sourceKey(), "old-selection"), List.of(), null);
    }

    private static SpecimenDraft draft(String scientificName) {
        return new SpecimenDraft(2, null, scientificName, -12.07, -77.08,
                null, null, null, null, null, null, null, null);
    }
}
