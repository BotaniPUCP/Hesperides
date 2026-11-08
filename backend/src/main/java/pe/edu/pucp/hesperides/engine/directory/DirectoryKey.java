package pe.edu.pucp.hesperides.engine.directory;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * La forma de un nombre con la que se comparan dos registros del Directorio: sin
 * tildes, sin mayúsculas y sin espacios a los lados. Es la misma regla que la
 * función {@code directory_key} de la base (V036), para detectar repetidos dentro
 * de un archivo antes de que lleguen a ella.
 */
public final class DirectoryKey {

    private static final Pattern MARKS = Pattern.compile("\\p{M}");

    private DirectoryKey() {
    }

    public static String of(String text) {
        if (text == null) {
            return null;
        }
        String decomposed = Normalizer.normalize(text.strip(), Normalizer.Form.NFD);
        return MARKS.matcher(decomposed).replaceAll("").toLowerCase(Locale.ROOT);
    }
}
