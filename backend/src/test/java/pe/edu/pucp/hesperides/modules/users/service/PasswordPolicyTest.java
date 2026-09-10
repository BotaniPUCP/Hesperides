package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    private static final String EMAIL = "ana.torres@pucp.edu.pe";
    private static final String FIRST = "Ana";
    private static final String LAST = "Torres";

    private void validate(String password) {
        policy.validate(password, EMAIL, FIRST, LAST);
    }

    @Test
    void acceptsAPasswordThatMeetsEveryRule() {
        assertThatCode(() -> validate("Hesperides2026")).doesNotThrowAnyException();
    }

    @Test
    void rejectsAPasswordShorterThanTenCharacters() {
        assertThatThrownBy(() -> validate("Corta123"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("10");
    }

    @Test
    void rejectsAPasswordLongerThanSeventyTwoBytes() {
        // BCrypt trunca en silencio mas alla de 72 bytes: una contrasena
        // truncada sin aviso es peor que una corta (SPEC-100 §9.1).
        assertThatThrownBy(() -> validate("A1" + "z".repeat(71)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("72");
    }

    @Test
    void rejectsAPasswordWithoutAnUppercaseLetter() {
        assertThatThrownBy(() -> validate("hesperides2026"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsAPasswordWithoutALowercaseLetter() {
        assertThatThrownBy(() -> validate("HESPERIDES2026"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsAPasswordWithoutADigit() {
        assertThatThrownBy(() -> validate("HesperidesVerde"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void acceptsAPasswordWithoutSpecialCharacters() {
        // No se exige caracter especial a proposito: alarga la clave sin subir
        // la entropia de forma significativa y empuja a patrones predecibles.
        assertThatCode(() -> validate("AreasVerdes7")).doesNotThrowAnyException();
    }

    @Test
    void rejectsAPasswordThatContainsTheEmailLocalPart() {
        assertThatThrownBy(() -> validate("Ana.torres2026"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("datos personales");
    }

    @Test
    void rejectsAPasswordThatContainsTheFirstName() {
        assertThatThrownBy(() -> validate("MiClaveAna123"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsAPasswordThatContainsTheLastName() {
        assertThatThrownBy(() -> validate("Torres123456"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void comparesPersonalDataIgnoringCase() {
        // "ANA" dentro de la clave es igual de adivinable que "Ana".
        assertThatThrownBy(() -> validate("ClaveANA12345"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsNullAndBlank() {
        assertThatThrownBy(() -> validate(null)).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate("   ")).isInstanceOf(ValidationException.class);
    }

    @Test
    void toleratesNullPersonalDataWithoutCrashing() {
        // El cambio de contrasena propia no siempre tiene el nombre a mano.
        assertThatCode(() -> policy.validate("Hesperides2026", null, null, null))
                .doesNotThrowAnyException();
    }
}
