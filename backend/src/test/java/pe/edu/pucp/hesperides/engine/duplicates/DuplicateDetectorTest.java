package pe.edu.pucp.hesperides.engine.duplicates;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Posibles duplicados por cercanía (SPEC-103 D-05), sin base de datos. */
class DuplicateDetectorTest {

    private static final double LAT = -12.0700;
    private static final double LON = -77.0800;
    /** Un metro hacia el norte, en grados, a la latitud del campus. */
    private static final double ONE_METRE_LAT = 1 / 110_600.0;

    private static Nearby at(String code, String species, double metresNorth) {
        return new Nearby(code, species, LAT + metresNorth * ONE_METRE_LAT, LON);
    }

    @Test
    void aPalmLessThanAMetreFromAnotherOfItsSpeciesIsADuplicate() {
        var match = DuplicateDetector.find(LAT, LON, "roystonea-regia", "PALM",
                List.of(at("EV-000001", "roystonea-regia", 0.9)));

        assertThat(match).isPresent();
        assertThat(match.get().code()).isEqualTo("EV-000001");
        assertThat(match.get().distanceM()).isBetween(0.85, 0.95);
    }

    @Test
    void aPalmMoreThanAMetreAwayIsNot() {
        assertThat(DuplicateDetector.find(LAT, LON, "roystonea-regia", "PALM",
                List.of(at("EV-000001", "roystonea-regia", 1.1)))).isEmpty();
    }

    @Test
    void aShrubUsesASmallerRadius() {
        // A 0.8 m dos palmeras serían la misma; dos arbustos, no.
        assertThat(DuplicateDetector.find(LAT, LON, "coffea-arabica", "SHRUB",
                List.of(at("EV-000100", "coffea-arabica", 0.8)))).isEmpty();
        assertThat(DuplicateDetector.find(LAT, LON, "coffea-arabica", "SHRUB",
                List.of(at("EV-000100", "coffea-arabica", 0.4)))).isPresent();
    }

    @Test
    void onlyTheSameSpeciesCounts() {
        assertThat(DuplicateDetector.find(LAT, LON, "roystonea-regia", "PALM",
                List.of(at("EV-000002", "phoenix-canariensis", 0.2)))).isEmpty();
    }

    @Test
    void theClosestCandidateWins() {
        var match = DuplicateDetector.find(LAT, LON, "tipuana-tipu", "TREE",
                List.of(at("EV-000010", "tipuana-tipu", 1.2), at("EV-000011", "tipuana-tipu", 0.3)));

        assertThat(match.get().code()).isEqualTo("EV-000011");
    }

    @Test
    void campusFeaturesUseOneMetreWithoutSpecies() {
        assertThat(DuplicateDetector.findFeature(LAT, LON, List.of(at("PT_b1", null, 0.7)))).isPresent();
        assertThat(DuplicateDetector.findFeature(LAT, LON, List.of(at("PT_b1", null, 1.3)))).isEmpty();
    }

    @Test
    void anUnknownVegetationTypeFailsInsteadOfGuessing() {
        assertThatThrownBy(() -> DuplicateDetector.thresholdFor("NUEVO_TIPO"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
