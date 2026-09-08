package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.Test;

import java.util.Locale;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class TemporaryPasswordGeneratorTest {

    private static final Pattern AMBIGUOUS = Pattern.compile("[lI1O0]");

    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator();
    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void generatedPasswordsMeetThePolicyForThousandRuns() {
        for (int i = 0; i < 1000; i++) {
            String password = generator.generate();
            assertThat(policy.evaluate(password, "x@pucp.edu.pe", "Juan", "Perez"))
                    .as("fallo en iteración %d: %s", i, password)
                    .isNull();
        }
    }

    @Test
    void twoConsecutiveCallsReturnDifferentValues() {
        assertThat(generator.generate()).isNotEqualTo(generator.generate());
    }

    @Test
    void neverUsesAmbiguousCharacters() {
        for (int i = 0; i < 100; i++) {
            assertThat(AMBIGUOUS.matcher(generator.generate()).find()).isFalse();
        }
    }

    @Test
    void hasTheDocumentedLength() {
        assertThat(generator.generate()).hasSize(12);
    }

    @Test
    void containsOnlyAsciiLettersAndDigits() {
        for (int i = 0; i < 100; i++) {
            assertThat(generator.generate()).matches("[A-Za-z0-9]{12}");
        }
    }
}