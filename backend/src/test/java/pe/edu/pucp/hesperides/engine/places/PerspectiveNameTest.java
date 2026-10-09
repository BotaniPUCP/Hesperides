package pe.edu.pucp.hesperides.engine.places;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PerspectiveNameTest {

    @Test
    void frontAndBackUseOnlyThePlaceName() {
        assertThat(PerspectiveName.of(PerspectiveSide.FRONT, "CIA", null, CompassPoint.NORTH, "Gelarti"))
                .isEqualTo("Frente de CIA");
        assertThat(PerspectiveName.of(PerspectiveSide.BACK, "CIA", null, CompassPoint.SOUTH, null))
                .isEqualTo("Espalda de CIA");
    }

    @Test
    void aSideAddsTheCompassPointAndTheLandmark() {
        assertThat(PerspectiveName.of(PerspectiveSide.SIDE, "CIA", null, CompassPoint.WEST, "Gelarti"))
                .isEqualTo("Al lado de CIA · oeste, hacia Gelarti");
    }

    @Test
    void aSideWithoutLandmarkKeepsTheCompassPoint() {
        assertThat(PerspectiveName.of(PerspectiveSide.SIDE, "CIA", null, CompassPoint.NORTH_EAST, null))
                .isEqualTo("Al lado de CIA · noreste");
    }

    @Test
    void aSideOnTopOfTheCenterHasNoCompassPoint() {
        assertThat(PerspectiveName.of(PerspectiveSide.SIDE, "CIA", null, null, "Gelarti"))
                .isEqualTo("Al lado de CIA, hacia Gelarti");
    }

    @Test
    void theParentFollowsThePlaceName() {
        assertThat(PerspectiveName.of(PerspectiveSide.SIDE, "Cancha 1", "Polideportivo", CompassPoint.NORTH, null))
                .isEqualTo("Al lado de Cancha 1 · Polideportivo · norte");
        assertThat(PerspectiveName.of(PerspectiveSide.FRONT, "Cancha 1", "Polideportivo", null, null))
                .isEqualTo("Frente de Cancha 1 · Polideportivo");
    }

    @Test
    void aPlaceWithoutNameCannotBeNamed() {
        assertThatThrownBy(() -> PerspectiveName.of(PerspectiveSide.FRONT, " ", null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
