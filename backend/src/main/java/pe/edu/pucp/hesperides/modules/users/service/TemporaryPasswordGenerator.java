package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Genera la contraseña temporal que viaja por correo. Usa SecureRandom y nunca
 * java.util.Random: esta cadena es una credencial real durante el tiempo que
 * tarda la persona en entrar, y un generador predecible la haría adivinable.
 */
@Component
public class TemporaryPasswordGenerator {

    /**
     * Alfabetos sin caracteres ambiguos: faltan l, I, 1, O y 0 porque la clave
     * se dicta por teléfono o se copia a mano desde el correo (SPEC-100 §9.1).
     */
    private static final String LOWER = "abcdefghijkmnpqrstuvwxyz";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String ALL = LOWER + UPPER + DIGITS;

    private static final int LENGTH = 14;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        // Se siembra con uno de cada clase antes de rellenar: dejarlo al azar
        // puro produciría, de vez en cuando, una clave sin dígitos que la propia
        // política rechazaría — un fallo intermitente en el alta.
        StringBuilder password = new StringBuilder(LENGTH);
        password.append(randomChar(LOWER));
        password.append(randomChar(UPPER));
        password.append(randomChar(DIGITS));

        while (password.length() < LENGTH) {
            password.append(randomChar(ALL));
        }

        return shuffle(password);
    }

    private char randomChar(String alphabet) {
        return alphabet.charAt(secureRandom.nextInt(alphabet.length()));
    }

    /** Sin mezclar, las tres primeras posiciones tendrían siempre el mismo tipo. */
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
