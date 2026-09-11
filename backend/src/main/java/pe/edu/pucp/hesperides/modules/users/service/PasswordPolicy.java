package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Locale;

/**
 * Valida la política de SPEC-100 §9.1. Sin I/O ni dependencias: la misma regla
 * aplica a la contraseña inicial que escribe el administrador, a la temporal que
 * genera el sistema y a la que elige la persona.
 *
 * Lanza en vez de devolver boolean para que el motivo exacto viaje con el error:
 * con un boolean, cada llamador inventaría su propio mensaje y acabarían siendo
 * tres mensajes distintos para la misma regla.
 */
@Component
public class PasswordPolicy {

    public static final int MIN_LENGTH = 10;

    /**
     * 72 bytes es el límite real de BCrypt: más allá trunca en silencio, y una
     * contraseña truncada sin aviso es peor que una corta.
     */
    public static final int MAX_LENGTH = 72;

    /**
     * Un nombre de una o dos letras aparecería por azar en casi cualquier
     * contraseña y bloquearía claves legítimas. Tres es el umbral donde la
     * coincidencia deja de ser casual.
     */
    private static final int MIN_PERSONAL_FRAGMENT = 3;

    public void validate(String password, String email, String firstName, String lastName) {
        if (password == null || password.isBlank()) {
            throw new ValidationException("La contraseña es obligatoria");
        }
        if (password.length() < MIN_LENGTH) {
            throw new ValidationException(
                    "La contraseña debe tener al menos " + MIN_LENGTH + " caracteres");
        }
        if (password.length() > MAX_LENGTH) {
            throw new ValidationException(
                    "La contraseña no puede superar los " + MAX_LENGTH + " caracteres");
        }
        if (password.chars().noneMatch(Character::isLowerCase)) {
            throw new ValidationException("La contraseña debe incluir al menos una letra minúscula");
        }
        if (password.chars().noneMatch(Character::isUpperCase)) {
            throw new ValidationException("La contraseña debe incluir al menos una letra mayúscula");
        }
        if (password.chars().noneMatch(Character::isDigit)) {
            throw new ValidationException("La contraseña debe incluir al menos un dígito");
        }
        rejectPersonalData(password, email, firstName, lastName);
    }

    /**
     * Una contraseña que contiene el nombre o el correo de su dueño es de las
     * primeras que prueba quien lo conoce. Los datos personales pueden llegar
     * nulos (el cambio de contraseña propia no siempre los tiene a mano): en ese
     * caso solo se omite esta comprobación, no la política entera.
     */
    private void rejectPersonalData(String password, String email, String firstName, String lastName) {
        String lower = password.toLowerCase(Locale.ROOT);
        String emailLocalPart = email == null ? null : email.split("@")[0];

        for (String personal : new String[] {emailLocalPart, firstName, lastName}) {
            if (personal == null || personal.length() < MIN_PERSONAL_FRAGMENT) {
                continue;
            }
            if (lower.contains(personal.toLowerCase(Locale.ROOT))) {
                throw new ValidationException("La contraseña no puede contener tus datos personales");
            }
        }
    }
}
