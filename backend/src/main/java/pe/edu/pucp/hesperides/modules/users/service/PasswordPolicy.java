package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Política de contraseñas de la SPEC-100 §9.1, compartida por la contraseña
 * inicial que escribe el ADMIN, la temporal que genera el sistema y la que la
 * persona elige.
 */
@Component
public class PasswordPolicy {

    /** Más de 72 bytes trunca BCrypt en silencio (SPEC-100 §9.1). */
    public static final int MAX_LENGTH = 72;
    public static final int MIN_LENGTH = 10;

    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    /**
     * @return mensaje de la primera violación, o null si la contraseña cumple
     */
    public String evaluate(String password, String email, String firstName, String lastName) {
        if (password == null || password.length() < MIN_LENGTH) {
            return "Debe tener al menos 10 caracteres";
        }
        if (password.length() > MAX_LENGTH) {
            return "No debe exceder los 72 caracteres";
        }
        if (!UPPERCASE.matcher(password).find()
                || !LOWERCASE.matcher(password).find()
                || !DIGIT.matcher(password).find()) {
            return "Debe incluir una letra mayúscula, una minúscula y un dígito";
        }
        String normalized = fold(password);
        if (email != null && !email.isBlank() && foldedContains(normalized, fold(email))) {
            return "No puede coincidir con el correo";
        }
        for (String part : new String[]{firstName, lastName}) {
            if (part != null && !part.isBlank() && foldedContains(normalized, fold(part))) {
                return "No puede coincidir con el nombre o apellido";
            }
        }
        return null;
    }

    /** Compara la contraseña contra el correo completo y contra su parte local. */
    private boolean foldedContains(String haystack, String needle) {
        return haystack.contains(needle);
    }

    /** Normaliza a minúsculas, sin acentos y sin espacios para la comparación. */
    public static String fold(String value) {
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return decomposed.toLowerCase(Locale.ROOT).replace(" ", "");
    }
}