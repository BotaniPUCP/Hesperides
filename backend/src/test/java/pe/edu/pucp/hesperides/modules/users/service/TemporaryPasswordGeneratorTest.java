package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class TemporaryPasswordGeneratorTest {

    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator();
    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void everyGeneratedPasswordSatisfiesThePolicy() {
        // Mil iteraciones porque el fallo seria intermitente: una generacion que
        // cumple la politica el 99% de las veces rompe un alta de cada cien.
        for (int i = 0; i < 1000; i++) {
            String generated = generator.generate();
            assertThatCode(() -> policy.validate(generated, null, null, null))
                    .as("intento %d produjo '%s'", i, generated)
                    .doesNotThrowAnyException();
        }
    }

    @Test
    void twoConsecutiveCallsProduceDifferentValues() {
        assertThat(generator.generate()).isNotEqualTo(generator.generate());
    }

    @Test
    void aThousandGenerationsProduceNoCollisions() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            seen.add(generator.generate());
        }
        assertThat(seen).hasSize(1000);
    }

    @Test
    void avoidsCharactersThatAreAmbiguousWhenDictatedOrCopiedByHand() {
        // Se dicta por telefono o se copia del correo: l, I, 1, O y 0 se
        // confunden entre si (SPEC-100 §9.1).
        for (int i = 0; i < 200; i++) {
            assertThat(generator.generate()).doesNotContainAnyWhitespaces()
                    .doesNotContain("l").doesNotContain("I")
                    .doesNotContain("1").doesNotContain("O").doesNotContain("0");
        }
    }
}
