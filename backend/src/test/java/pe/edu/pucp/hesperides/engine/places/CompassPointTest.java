package pe.edu.pucp.hesperides.engine.places;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pe.edu.pucp.hesperides.engine.proximity.PlanarPoint;

class CompassPointTest {

    private static final PlanarPoint CENTER = new PlanarPoint(0, 0);

    @ParameterizedTest(name = "{0}° es {1}")
    @CsvSource({
            "0, NORTH", "22.4, NORTH", "22.5, NORTH_EAST", "45, NORTH_EAST", "90, EAST", "135, SOUTH_EAST",
            "180, SOUTH", "225, SOUTH_WEST", "270, WEST", "315, NORTH_WEST", "337.4, NORTH_WEST", "337.5, NORTH",
            "359.9, NORTH"})
    void roundsTheBearingToTheNearestOfEightDirections(double bearing, CompassPoint expected) {
        assertThat(CompassPoint.ofBearing(bearing)).isEqualTo(expected);
    }

    @Test
    void aBearingOutsideZeroTo360IsNormalizedFirst() {
        assertThat(CompassPoint.ofBearing(-90)).isEqualTo(CompassPoint.WEST);
        assertThat(CompassPoint.ofBearing(450)).isEqualTo(CompassPoint.EAST);
    }

    @Test
    void theDirectionFromTheCenterToAPointSouthOfItIsSouth() {
        assertThat(CompassPoint.from(CENTER, new PlanarPoint(0, -40))).contains(CompassPoint.SOUTH);
        assertThat(CompassPoint.from(CENTER, new PlanarPoint(-30, 30))).contains(CompassPoint.NORTH_WEST);
    }

    @Test
    void aPointOnTopOfTheCenterHasNoDirection() {
        assertThat(CompassPoint.from(CENTER, new PlanarPoint(0.1, -0.1))).isEmpty();
    }

    @Test
    void labelsAreTheSpanishWordsUsedInTheName() {
        assertThat(CompassPoint.NORTH_EAST.label()).isEqualTo("noreste");
        assertThat(CompassPoint.SOUTH_WEST.label()).isEqualTo("suroeste");
    }
}
