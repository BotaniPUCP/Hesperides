package pe.edu.pucp.hesperides.engine.places;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LandmarkPickerTest {

    private static LandmarkCandidate place(long id, String name, double distanceM) {
        return new LandmarkCandidate(id, name, distanceM);
    }

    @Test
    void picksTheNearestCandidate() {
        List<LandmarkCandidate> candidates = List.of(place(1, "Sociales", 30), place(2, "Gelarti", 12));

        assertThat(LandmarkPicker.pick(candidates, Set.of())).map(LandmarkCandidate::name).contains("Gelarti");
    }

    @Test
    void ignoresThePlaceItselfItsAncestorsAndItsDescendants() {
        List<LandmarkCandidate> candidates = List.of(place(1, "Polideportivo", 0), place(2, "Cancha 2", 5),
                place(3, "Letras", 40));

        assertThat(LandmarkPicker.pick(candidates, Set.of(1L, 2L))).map(LandmarkCandidate::name).contains("Letras");
    }

    @Test
    void aCandidateExactlyAtTheLimitStillCounts() {
        List<LandmarkCandidate> candidates = List.of(place(1, "Gelarti", PlaceThresholds.LANDMARK_MAX_M));

        assertThat(LandmarkPicker.pick(candidates, Set.of())).isPresent();
    }

    @Test
    void aCandidateBeyondTheLimitIsNotALandmark() {
        List<LandmarkCandidate> candidates = List.of(place(1, "Gelarti", PlaceThresholds.LANDMARK_MAX_M + 0.1));

        assertThat(LandmarkPicker.pick(candidates, Set.of())).isEmpty();
    }

    @Test
    void withNoCandidatesThereIsNoLandmark() {
        assertThat(LandmarkPicker.pick(List.of(), Set.of())).isEmpty();
    }

    @Test
    void aTieIsBrokenByNameSoTheResultNeverDependsOnQueryOrder() {
        List<LandmarkCandidate> candidates = List.of(place(1, "Sociales", 10), place(2, "Gelarti", 10));

        assertThat(LandmarkPicker.pick(candidates, Set.of())).map(LandmarkCandidate::name).contains("Gelarti");
    }
}
