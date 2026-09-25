package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Locale;

/**
 * Valida la política de SPEC-100 §9.1 (sin I/O aparte de la lectura tipada del
 * parámetro de sistema): la misma regla aplica a la contraseña inicial que
 * escribe el administrador, a la temporal que genera el sistema y a la que elige
 * la persona.
 *
 * La longitud mínima la da {@code system_parameters.PASSWORD_MIN_LENGTH}; el
 * constructor sin argumentos —usado por los test de unidad— conserva la
 * constante como defecto para no atar los tests a la base de datos.
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

    private final SystemParameterReader parameters;

    public PasswordPolicy() {
        this(null);
    }

    @Autowired
    public PasswordPolicy(SystemParameterReader parameters) {
        this.parameters = parameters;
    }

    public void validate(String password, String email, String firstName, String lastName) {
        if (password == null || password.isBlank()) {
            throw new ValidationException("La contraseña es obligatoria");
        }
        int minimumLength = minimumLength();
        if (password.length() < minimumLength) {
            throw new ValidationException(
                    "La contraseña debe tener al menos " + minimumLength + " caracteres");
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

    /** Sin parámetros en los tests de unidad; con el bean de Spring, desde la base. */
    private int minimumLength() {
        return parameters == null ? MIN_LENGTH
                : parameters.readInt(SystemParameterCodes.PASSWORD_MIN_LENGTH, MIN_LENGTH);
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
