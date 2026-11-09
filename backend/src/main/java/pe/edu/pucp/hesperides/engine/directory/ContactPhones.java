package pe.edu.pucp.hesperides.engine.directory;

import java.util.regex.Pattern;

/**
 * Anexo y celular de un contacto. Se normalizan aquí y no en el formulario para
 * que el alta manual y el script de carga den el mismo resultado (SPEC-106 §5.4).
 */
public final class ContactPhones {

    private static final Pattern SEPARATORS = Pattern.compile("[\\s-]");
    private static final Pattern EXTENSION = Pattern.compile("^[0-9]{4}$");
    private static final Pattern MOBILE = Pattern.compile("^9[0-9]{8}$");

    private ContactPhones() {
    }

    /** Sin espacios ni guiones; null si no queda nada. */
    public static String normalize(String phone) {
        if (phone == null) {
            return null;
        }
        String digits = SEPARATORS.matcher(phone).replaceAll("");
        return digits.isEmpty() ? null : digits;
    }

    public static boolean isValidExtension(String extension) {
        return extension != null && EXTENSION.matcher(extension).matches();
    }

    public static boolean isValidMobile(String mobile) {
        return mobile != null && MOBILE.matcher(mobile).matches();
    }
}
