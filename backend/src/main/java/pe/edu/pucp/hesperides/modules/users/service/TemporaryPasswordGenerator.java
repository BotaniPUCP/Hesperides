package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Genera contraseñas temporales (SPEC-100 §9.1). Componente puro sin I/O.
 *
 * Alfabeto sin caracteres ambiguos (sin l/I/1/O/0) porque la contraseña a
 * menudo se dicta por teléfono o se copia a mano desde el correo. Se garantiza
 * al menos una minúscula, una mayúscula y un dígito, como exige la política.
 */
@Component
public class TemporaryPasswordGenerator {

    private static final String LOWER = "abcdefghijkmnpqrstuvwxyz";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String ALPHABET = LOWER + UPPER + DIGITS;

    private static final int LENGTH = 12;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        StringBuilder password = new StringBuilder(LENGTH);

        // Garantías de categoría (escala "al menos una de cada"), así la política
        // nunca se cumple por azar.
        password.append(LOWER.charAt(secureRandom.nextInt(LOWER.length())));
        password.append(UPPER.charAt(secureRandom.nextInt(UPPER.length())));
        password.append(DIGITS.charAt(secureRandom.nextInt(DIGITS.length())));

        while (password.length() < LENGTH) {
            password.append(ALPHABET.charAt(secureRandom.nextInt(ALPHABET.length())));
        }

        return shuffle(password);
    }

    private String shuffle(StringBuilder password) {
        for (int i = password.length() - 1; i > 0; i--) {
            int j = secureRandom.nextInt(i + 1);
            char tmp = password.charAt(i);
            password.setCharAt(i, password.charAt(j));
            password.setCharAt(j, tmp);
        }
        return password.toString();
    }
}