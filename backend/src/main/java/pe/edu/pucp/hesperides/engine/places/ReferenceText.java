package pe.edu.pucp.hesperides.engine.places;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Lee el texto libre de una referencia antigua («Espalda de civil», «Frente a
 * Gelarti - sociales») y separa el lado que nombra del texto que nombra el lugar.
 * Es solo una sugerencia para quien migra: nunca enlaza nada por sí misma.
 *
 * @param side          el lado nombrado, o null si no nombra ninguno
 * @param sideUncertain «frente a X» a veces es «al otro lado de la calle, mirando a X»
 * @param placeText     el resto, sin tildes ni conectores, para buscar el lugar
 */
public record ReferenceText(PerspectiveSide side, boolean sideUncertain, String placeText) {

    private static final Map<String, PerspectiveSide> SIDE_WORDS = Map.of(
            "espalda", PerspectiveSide.BACK, "atras", PerspectiveSide.BACK, "detras", PerspectiveSide.BACK,
            "costado", PerspectiveSide.SIDE, "lateral", PerspectiveSide.SIDE, "lado", PerspectiveSide.SIDE,
            "frente", PerspectiveSide.FRONT);

    /** Palabras que unen y no nombran nada; «e» aparece en las referencias por «de». */
    private static final Set<String> CONNECTORS = Set.of("de", "del", "a", "al", "la", "el", "los", "las", "y", "en", "e");

    public static ReferenceText parse(String text) {
        PerspectiveSide side = null;
        List<String> rest = new ArrayList<>();
        for (String word : normalize(text).split(" ")) {
            if (word.isEmpty() || CONNECTORS.contains(word)) {
                continue;
            }
            PerspectiveSide named = SIDE_WORDS.get(word);
            if (named == null) {
                rest.add(word);
            } else if (side == null) {
                side = named;
            }
        }
        return new ReferenceText(side, side == PerspectiveSide.FRONT, String.join(" ", rest));
    }

    /** Minúsculas, sin tildes y sin signos: «Laboratorio (hidráulica)» → «laboratorio hidraulica». */
    public static String normalize(String text) {
        String withoutAccents = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").strip();
    }
}
