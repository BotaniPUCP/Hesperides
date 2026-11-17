package pe.edu.pucp.hesperides.shared.text;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesNames;
import pe.edu.pucp.hesperides.modules.inventory.service.ScientificNameNormalizer;

import static org.assertj.core.api.Assertions.assertThat;

class SpeciesNameKeyTest {

    @Test
    void canonicalizesUnicodeWhitespaceAndCaseWithoutLosingDiacriticsOrPunctuation() {
        assertThat(SpeciesNameKey.key("  ÑANDÚ\tÁRBOL  "))
                .isEqualTo(SpeciesNameKey.key("Ñandú Árbol"));
        assertThat(SpeciesNameKey.key("O’Árbol"))
                .isNotEqualTo(SpeciesNameKey.key("O'Árbol"));
    }

    @Test
    void keepsScientificSymbolsAndMarkerPeriodsSignificant() {
        assertThat(SpeciesNameKey.key("Cupressocyparis × leylandii"))
                .isNotEqualTo(SpeciesNameKey.key("Cupressocyparis x leylandii"));
        assertThat(SpeciesNameKey.key("Ficus sp."))
                .isNotEqualTo(SpeciesNameKey.key("Ficus sp"));
        assertThat(SpeciesNameKey.key("Ficus sp."))
                .isNotEqualTo(SpeciesNameKey.key("Ficus spp."));
    }

    @Test
    void compatibilityFacadesDelegateToTheSingleCanonicalKey() {
        String value = "Cupressocyparis × leylandii";
        assertThat(SpeciesNames.key(value)).isEqualTo(SpeciesNameKey.key(value));
        assertThat(ScientificNameNormalizer.key(value)).isEqualTo(SpeciesNameKey.key(value));
    }
}
