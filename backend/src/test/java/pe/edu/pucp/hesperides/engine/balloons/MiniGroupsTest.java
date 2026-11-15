package pe.edu.pucp.hesperides.engine.balloons;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-113 §5.3: un conjunto disperso se parte en minigrupos por cercanía. */
class MiniGroupsTest {

    /** Un grado de latitud mide ~111 km: 0.0001° son ~11 m. */
    private static final double STEP_10_M = 0.00009;

    private static GeoPoint north(GeoPoint from, double meters) {
        return new GeoPoint(from.lat() + meters / 10 * STEP_10_M, from.lon());
    }

    private static final GeoPoint ORIGIN = new GeoPoint(-12.0690, -77.0790);

    @Test
    void twoPairsFarApartBecomeTwoGroups() {
        var a = ORIGIN;
        var b = north(ORIGIN, 10);
        var c = north(ORIGIN, 200);
        var d = north(ORIGIN, 210);

        var groups = MiniGroups.split(List.of(a, b, c, d), MiniGroups.LINK_METERS);

        assertThat(groups).containsExactly(List.of(a, b), List.of(c, d));
    }

    @Test
    void nearnessIsTransitive() {
        var a = ORIGIN;
        var b = north(ORIGIN, 50);
        var c = north(ORIGIN, 100);

        assertThat(MiniGroups.split(List.of(a, c, b), MiniGroups.LINK_METERS)).hasSize(1);
    }

    @Test
    void oneAnchorIsOneGroupAndNoneIsNoGroup() {
        assertThat(MiniGroups.split(List.of(ORIGIN), MiniGroups.LINK_METERS)).containsExactly(List.of(ORIGIN));
        assertThat(MiniGroups.split(List.of(), MiniGroups.LINK_METERS)).isEmpty();
    }

    @Test
    void theBalloonSitsOnTheAnchorClosestToTheCenter() {
        var a = ORIGIN;
        var b = north(ORIGIN, 20);
        var c = north(ORIGIN, 50);

        assertThat(MiniGroups.pin(List.of(a, b, c))).isEqualTo(b);
    }

    @Test
    void theSameInputGivesTheSameGroupsInTheSameOrder() {
        var points = List.of(north(ORIGIN, 300), ORIGIN, north(ORIGIN, 10));

        assertThat(MiniGroups.split(points, MiniGroups.LINK_METERS))
                .isEqualTo(MiniGroups.split(points, MiniGroups.LINK_METERS))
                .first().isEqualTo(List.of(north(ORIGIN, 300)));
    }
}
