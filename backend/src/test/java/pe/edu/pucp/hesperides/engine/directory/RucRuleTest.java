package pe.edu.pucp.hesperides.engine.directory;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RucRuleTest {

    @Test
    void aLegalEntityRucIsValid() {
        assertThat(RucRule.isValid("20123456789")).isTrue();
    }

    @Test
    void aNaturalPersonRucIsValid() {
        assertThat(RucRule.isValid("10456789123")).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"2012345678", "201234567890", "30123456789", "2012345678A", " 20123456789"})
    void anythingElseIsInvalid(String ruc) {
        assertThat(RucRule.isValid(ruc)).isFalse();
    }

    @ParameterizedTest
    @NullAndEmptySource
    void aMissingRucIsInvalid(String ruc) {
        assertThat(RucRule.isValid(ruc)).isFalse();
    }
}
