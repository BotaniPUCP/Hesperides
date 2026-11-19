package pe.edu.pucp.hesperides.engine.directory;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ContactEmailTest {

    @ParameterizedTest
    @ValueSource(strings = {"xtorres@pucp.edu.pe", "a.b+c@empresa.com"})
    void aUsualAddressIsValid(String email) {
        assertThat(ContactEmail.isValid(email)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"no-es-correo", "a@b", "a b@pucp.edu.pe", "@pucp.edu.pe"})
    void anythingElseIsInvalid(String email) {
        assertThat(ContactEmail.isValid(email)).isFalse();
    }

    @ParameterizedTest
    @NullAndEmptySource
    void aMissingEmailIsInvalid(String email) {
        assertThat(ContactEmail.isValid(email)).isFalse();
    }
}
