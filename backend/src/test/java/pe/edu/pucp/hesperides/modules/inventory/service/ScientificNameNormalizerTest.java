package pe.edu.pucp.hesperides.modules.inventory.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScientificNameNormalizerTest {

    @Test
    void normalizesUnicodeSpacesAndEachWordWithoutRemovingDiacritics() {
        assertThat(ScientificNameNormalizer.normalize("  ÁRBOL\tMUÑA  ")).isEqualTo("Árbol muña");
        assertThat(ScientificNameNormalizer.normalize("MANGIFERA INDICA")).isEqualTo("Mangifera indica");
        assertThat(ScientificNameNormalizer.normalize("  ñANDÚ  ")).isEqualTo("Ñandú");
        assertThat(ScientificNameNormalizer.normalize("mANGO")).isEqualTo("Mango");
    }

    @Test
    void acceptsOnlyCompleteBotanicalMarkersAndEmitsThemInLowercase() {
        assertThat(ScientificNameNormalizer.normalize("FICUS SP.")).isEqualTo("Ficus sp.");
        assertThat(ScientificNameNormalizer.normalize("FICUS SPP.")).isEqualTo("Ficus spp.");
        assertThat(ScientificNameNormalizer.normalize("ACER RUBRUM SUBSP. DRUMMONDII"))
                .isEqualTo("Acer rubrum subsp. drummondii");
        assertThat(ScientificNameNormalizer.normalize("ACER RUBRUM VAR. DRUMMONDII"))
                .isEqualTo("Acer rubrum var. drummondii");

        assertInvalid("Ficus sppp.");
        assertInvalid("Ficus sp..");
        assertInvalid("Ficus sp.x");
    }

    @Test
    void acceptsInternalAsciiHyphensAndTheStandaloneMultiplicationSign() {
        assertThat(ScientificNameNormalizer.normalize("TESTFLORA-ALBA ESPECIE-UNO"))
                .isEqualTo("Testflora-alba especie-uno");
        assertThat(ScientificNameNormalizer.normalize("CUPRESSOCYPARIS × LEYLANDII"))
                .isEqualTo("Cupressocyparis × leylandii");
        assertThat(ScientificNameNormalizer.normalize("× CUPRESSOCYPARIS LEYLANDII"))
                .isEqualTo("× Cupressocyparis leylandii");

        assertInvalid("-Ficus indica");
        assertInvalid("Ficus- indica");
        assertInvalid("Ficus--indica");
        assertInvalid("Ficus–indica");
        assertInvalid("Ficus—indica");
        assertInvalid("Ficus×indica");
        assertInvalid("Ficus × × indica");
        assertInvalid("Ficus indica ×");
    }

    @Test
    void preservesAQuotedCultivarEpithetForCatalogExportRoundTrips() {
        assertThat(ScientificNameNormalizer.normalize("FICUS BENJAMINA 'VARIEGATA'"))
                .isEqualTo("Ficus benjamina 'Variegata'");
        assertThat(ScientificNameNormalizer.normalize("FICUS BENJAMINA ‘VARIEGATA’"))
                .isEqualTo("Ficus benjamina ‘Variegata’");
        assertInvalid("O'Ficus indica");
        assertInvalid("Ficus 'Variegata' benjamina");
    }

    @Test
    void rejectsUnapprovedCharactersButAcceptsLettersFromOtherScripts() {
        assertThat(ScientificNameNormalizer.normalize("ΕΛΛΗΝΙΚΌ ΌΝΟΜΑ")).isEqualTo("Ελληνικό όνομα");
        assertInvalid("Ficus 2");
        assertInvalid("Ficus/indica");
        assertInvalid("O'Ficus indica");
        assertInvalid("Ficus, indica");
        assertInvalid("Ficus (indica)");
        assertInvalid("Ficus_indica");
        assertInvalid("Ficus #indica");
    }

    private static void assertInvalid(String input) {
        assertThatThrownBy(() -> ScientificNameNormalizer.normalize(input))
                .isInstanceOf(ValidationException.class);
    }
}
