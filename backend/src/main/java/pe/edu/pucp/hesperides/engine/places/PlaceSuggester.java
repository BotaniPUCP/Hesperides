package pe.edu.pucp.hesperides.engine.places;

import java.util.Comparator;
import java.util.List;

/**
 * Ordena los lugares que podrían corresponder a una referencia. Pesa el parecido
 * del nombre y, sobre todo, la cercanía: las referencias están escritas a mano
 * («lmed», «labortorio»), pero su punto en el mapa casi siempre cae sobre el
 * lugar o junto a él.
 */
public final class PlaceSuggester {

    public static final int MAX_SUGGESTIONS = 3;

    /** Por debajo de esto el nombre no se parece, salvo que el lugar esté ahí mismo. */
    private static final double MIN_SIMILARITY = 0.2;
    private static final double ON_TOP_M = 30;
    private static final double NEARBY_M = 100;
    private static final double ON_TOP_BONUS = 0.3;
    private static final double NEARBY_BONUS = 0.15;

    private PlaceSuggester() {
    }

    public static List<SuggestionCandidate> rank(List<SuggestionCandidate> candidates) {
        return candidates.stream()
                .filter(c -> c.similarity() >= MIN_SIMILARITY || onTop(c))
                .sorted(Comparator.comparingDouble(PlaceSuggester::score).reversed()
                        .thenComparing(SuggestionCandidate::name))
                .limit(MAX_SUGGESTIONS)
                .toList();
    }

    /** Parecido del nombre más un extra por cercanía. */
    public static double score(SuggestionCandidate c) {
        if (c.distanceM() == null) {
            return c.similarity();
        }
        double bonus = c.distanceM() <= ON_TOP_M ? ON_TOP_BONUS : c.distanceM() <= NEARBY_M ? NEARBY_BONUS : 0;
        return c.similarity() + bonus;
    }

    private static boolean onTop(SuggestionCandidate c) {
        return c.distanceM() != null && c.distanceM() <= ON_TOP_M;
    }
}
