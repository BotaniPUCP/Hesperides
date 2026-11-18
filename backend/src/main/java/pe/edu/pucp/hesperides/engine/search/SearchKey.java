package pe.edu.pucp.hesperides.engine.search;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * El texto en que el navegador busca una fila (SPEC-119 D-01), para las respuestas que se arman
 * en Java. Es la misma regla que {@code unaccent(lower(concat_ws(' ', …)))} en las consultas SQL:
 * sin tildes, sin mayúsculas, con rayas convertidas en guiones.
 */
public final class SearchKey {

    private static final Pattern MARKS = Pattern.compile("\\p{M}");
    private static final Pattern DASHES = Pattern.compile("[\\u2010-\\u2015]");

    private SearchKey() {
    }

    public static String of(String... parts) {
        String joined = Arrays.stream(parts).filter(Objects::nonNull).map(String::strip).filter(p -> !p.isEmpty())
                .collect(Collectors.joining(" "));
        String decomposed = Normalizer.normalize(joined, Normalizer.Form.NFD);
        return DASHES.matcher(MARKS.matcher(decomposed).replaceAll("")).replaceAll("-").toLowerCase(Locale.ROOT);
    }
}
