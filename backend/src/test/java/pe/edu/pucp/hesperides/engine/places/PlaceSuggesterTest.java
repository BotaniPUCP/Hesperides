package pe.edu.pucp.hesperides.engine.places;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PlaceSuggesterTest {

    private static SuggestionCandidate candidate(long id, String name, double similarity, Double distanceM) {
        return new SuggestionCandidate(id, name, similarity, distanceM);
    }

    @Test
    void ordersByNameSimilarity() {
        List<SuggestionCandidate> result = PlaceSuggester.rank(List.of(
                candidate(1, "Sociales", 0.3, null), candidate(2, "Ingeniería Civil", 0.8, null)));

        assertThat(result).extracting(SuggestionCandidate::name).containsExactly("Ingeniería Civil", "Sociales");
    }

    @Test
    void aPlaceRightNextToTheReferenceBeatsASlightlyBetterName() {
        List<SuggestionCandidate> result = PlaceSuggester.rank(List.of(
                candidate(1, "Civil (otro campus)", 0.6, 400.0), candidate(2, "Ingeniería Civil", 0.45, 10.0)));

        assertThat(result.get(0).name()).isEqualTo("Ingeniería Civil");
    }

    @Test
    void aDissimilarFarPlaceIsNotSuggested() {
        assertThat(PlaceSuggester.rank(List.of(candidate(1, "Sociales", 0.05, 500.0)))).isEmpty();
    }

    @Test
    void aDissimilarPlaceRightThereIsSuggested() {
        assertThat(PlaceSuggester.rank(List.of(candidate(1, "Pabellón Z", 0.05, 5.0)))).hasSize(1);
    }

    @Test
    void returnsAtMostThree() {
        List<SuggestionCandidate> many = List.of(candidate(1, "A", 0.9, null), candidate(2, "B", 0.8, null),
                candidate(3, "C", 0.7, null), candidate(4, "D", 0.6, null));

        assertThat(PlaceSuggester.rank(many)).hasSize(PlaceSuggester.MAX_SUGGESTIONS);
    }

    @Test
    void withNoPlacesThereAreNoSuggestions() {
        assertThat(PlaceSuggester.rank(List.of())).isEmpty();
    }
}
