package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** Limpieza común de los textos opcionales que llegan al Directorio. */
final class DirectoryText {

    private DirectoryText() {
    }

    /** Sin espacios a los lados; null si queda vacío. */
    static String optional(String text) {
        if (text == null) {
            return null;
        }
        String stripped = text.strip();
        return stripped.isEmpty() ? null : stripped;
    }

    /** Para la auditoría: el nombre del campo, nunca su valor. */
    static void addIfChanged(List<String> changed, String field, Object before, Object after) {
        if (!Objects.equals(before, after)) {
            changed.add(field);
        }
    }

    /** Compara listas de alias sin importar orden ni mayúsculas. */
    static List<String> sortedKeys(List<String> texts) {
        return texts.stream().map(text -> text.toLowerCase(Locale.ROOT)).sorted().toList();
    }
}
