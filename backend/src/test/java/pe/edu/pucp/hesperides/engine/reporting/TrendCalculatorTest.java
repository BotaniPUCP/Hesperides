package pe.edu.pucp.hesperides.engine.reporting;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.reporting.TrendCalculator.Trend;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-202 §8, "Resumen para OSG": progress is capped, delta in points, FLAT when it rounds to zero. */
class TrendCalculatorTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    @Test
    void deltaIsInPointsForAPercentAndMissingWithoutBothValues() {
        assertThat(TrendCalculator.delta(d("62.9"), d("58.1"))).isEqualByComparingTo("4.8");
        assertThat(TrendCalculator.delta(d("45"), d("38"))).isEqualByComparingTo("7");
        assertThat(TrendCalculator.delta(d("45"), null)).isNull();
        assertThat(TrendCalculator.delta(null, d("1"))).isNull();
    }

    @Test
    void trendFollowsTheSignAndIsFlatWhenTheRoundedDeltaIsZero() {
        assertThat(TrendCalculator.trend(d("4.8"))).isEqualTo(Trend.UP);
        assertThat(TrendCalculator.trend(d("-1.6"))).isEqualTo(Trend.DOWN);
        assertThat(TrendCalculator.trend(d("0.04"))).isEqualTo(Trend.FLAT);
        assertThat(TrendCalculator.trend(d("-0.04"))).isEqualTo(Trend.FLAT);
        assertThat(TrendCalculator.trend(null)).isNull();
    }

    @Test
    void progressIsCappedAtTheTargetAndNeedsAPositiveTarget() {
        assertThat(TrendCalculator.progress(d("62.9"), d("100"))).isEqualByComparingTo("62.9");
        assertThat(TrendCalculator.progress(d("62.9"), d("80"))).isEqualByComparingTo("78.6");
        assertThat(TrendCalculator.progress(d("95"), d("80"))).isEqualByComparingTo("100.0");
        assertThat(TrendCalculator.progress(d("10"), null)).isNull();
        assertThat(TrendCalculator.progress(d("10"), d("0"))).isNull();
        assertThat(TrendCalculator.progress(null, d("100"))).isNull();
    }
}
