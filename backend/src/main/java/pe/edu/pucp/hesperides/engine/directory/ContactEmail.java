package pe.edu.pucp.hesperides.engine.directory;

import java.util.regex.Pattern;

/** Un correo con forma de correo: algo, arroba, dominio con punto; sin espacios. */
public final class ContactEmail {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private ContactEmail() {
    }

    public static boolean isValid(String email) {
        return email != null && EMAIL.matcher(email).matches();
    }
}
