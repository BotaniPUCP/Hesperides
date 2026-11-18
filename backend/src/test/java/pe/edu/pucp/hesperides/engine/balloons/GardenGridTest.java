package pe.edu.pucp.hesperides.engine.balloons;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-113 §5.3b: los globos de un jardín se reparten centrados, en metros del mapa. */
class GardenGridTest {

    private static double distance(double[] o) {
        return Math.hypot(o[0], o[1]);
    }

    @Test
    void oneBalloonSitsOnTheCenter() {
        assertThat(GardenGrid.offsets(1, 5).getFirst()).containsExactly(0.0, 0.0);
    }

    @Test
    void twoBalloonsAreSymmetricAroundTheCenter() {
        List<double[]> offsets = GardenGrid.offsets(2, 5);
        double[] a = offsets.get(0);
        double[] b = offsets.get(1);
        assertThat(a[0] + b[0]).isCloseTo(0, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(a[1] + b[1]).isCloseTo(0, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(Math.hypot(a[0] - b[0], a[1] - b[1])).isCloseTo(5, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void candidatesGoFromTheCenterOutwardAndAreEnoughToChooseFrom() {
        List<double[]> offsets = GardenGrid.offsets(4, 5);
        assertThat(offsets.size()).isGreaterThan(20);
        for (int i = 1; i < offsets.size(); i++) {
            assertThat(distance(offsets.get(i))).isGreaterThanOrEqualTo(distance(offsets.get(i - 1)) - 1e-9);
        }
    }

    @Test
    void threeBalloonsMakeACenteredRow() {
        List<double[]> offsets = GardenGrid.offsets(3, 4).subList(0, 3);
        assertThat(offsets).extracting(o -> o[1]).containsOnly(0.0);
        assertThat(offsets.stream().mapToDouble(o -> o[0]).sum()).isZero();
    }

    @Test
    void theSameInputGivesTheSameOrder() {
        assertThat(GardenGrid.offsets(3, 2.5)).usingRecursiveComparison().isEqualTo(GardenGrid.offsets(3, 2.5));
    }

    @Test
    void aMovedPointIsTheGivenMetersAway() {
        GeoPoint center = new GeoPoint(-12.0694, -77.0796);
        assertThat(MiniGroups.meters(center, center.moved(3, 4))).isCloseTo(5, org.assertj.core.data.Offset.offset(0.05));
    }
}
