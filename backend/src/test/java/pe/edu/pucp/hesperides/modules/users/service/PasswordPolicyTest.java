package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    private static final String VALID = "ContraTemporal2026";

    @Test
    void acceptsACompliantPassword() {
        assertThat(policy.evaluate(VALID, "ana@pucp.edu.pe", "Ana", "Perez")).isNull();
    }

    @Test
    void rejectsShorterThanTen() {
        assertThat(policy.evaluate("Corto1", "ana@pucp.edu.pe", "Ana", "Perez")).contains("10");
    }

    @Test
    void rejectsLongerThanSeventyTwo() {
        String tooLong = "A1" + "a".repeat(72);
        assertThat(policy.evaluate(tooLong, "ana@pucp.edu.pe", "Ana", "Perez")).contains("72");
    }

    @Test
    void rejectsMissingCategory() {
        assertThat(policy.evaluate("solominusculas2026", "ana@pucp.edu.pe", "Ana", "Perez")).contains("mayúscula");
        assertThat(policy.evaluate("SOLOMAYUSCULAS2026", "ana@pucp.edu.pe", "Ana", "Perez")).contains("mayúscula");
        assertThat(policy.evaluate("SinDigitosQwer", "ana@pucp.edu.pe", "Ana", "Perez")).contains("dígito");
    }

    @Test
    void rejectsPasswordContainingTheEmail() {
        assertThat(policy.evaluate("Claveana2026pre@pucp.edu.pe", "ana2026pre@pucp.edu.pe", "Ana", "Perez"))
                .contains("correo");
    }

    @Test
    void rejectsPasswordContainingFirstNameOrLastName() {
        assertThat(policy.evaluate("PerezClave2026", "ana@pucp.edu.pe", "Ana", "Pérez")).contains("nombre");
        assertThat(policy.evaluate("ClaveAna2026", "ana@pucp.edu.pe", "Ana", "Perez")).contains("nombre");
    }

    @Test
    void doesNotRequireASpecialCharacter() {
        assertThat(policy.evaluate("SoloLetrasYDigitos9", "ana@pucp.edu.pe", "Ana", "Perez")).isNull();
    }

    @Test
    void nullPasswordIsIntolerable() {
        assertThat(policy.evaluate(null, "ana@pucp.edu.pe", "Ana", "Perez")).isNotNull();
    }
}