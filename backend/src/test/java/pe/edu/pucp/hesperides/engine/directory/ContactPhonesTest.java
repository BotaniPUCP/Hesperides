package pe.edu.pucp.hesperides.engine.directory;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ContactPhonesTest {

    @Test
    void spacesAndHyphensAreRemoved() {
        assertThat(ContactPhones.normalize(" 987 654-321 ")).isEqualTo("987654321");
    }

    @Test
    void aBlankPhoneNormalizesToNull() {
        assertThat(ContactPhones.normalize("  - ")).isNull();
        assertThat(ContactPhones.normalize(null)).isNull();
    }

    @Test
    void anExtensionHasFourDigits() {
        assertThat(ContactPhones.isValidExtension("4549")).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"454", "45490", "45a9"})
    void anythingElseIsNotAnExtension(String extension) {
        assertThat(ContactPhones.isValidExtension(extension)).isFalse();
    }

    @Test
    void aMobileHasNineDigitsStartingWithNine() {
        assertThat(ContactPhones.isValidMobile("987654321")).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"887654321", "98765432", "9876543210", "98765432a"})
    void anythingElseIsNotAMobile(String mobile) {
        assertThat(ContactPhones.isValidMobile(mobile)).isFalse();
    }
}
