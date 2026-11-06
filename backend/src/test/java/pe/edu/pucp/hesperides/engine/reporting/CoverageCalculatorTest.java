package pe.edu.pucp.hesperides.engine.reporting;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-202 §3.6: one decimal half-up, null without a denominator, areas with two decimals. */
class CoverageCalculatorTest {

    @Test
    void weightsByAreaAndRoundsToOneDecimalHalfUp() {
        assertThat(CoverageCalculator.percent(new BigDecimal("1000"), new BigDecimal("4000")))
                .isEqualByComparingTo("25.0").hasScaleOf(1);
        assertThat(CoverageCalculator.percent(new BigDecimal("1"), new BigDecimal("3"))).isEqualByComparingTo("33.3");
        assertThat(CoverageCalculator.percent(new BigDecimal("2"), new BigDecimal("3"))).isEqualByComparingTo("66.7");
        // 0.05 % rounds up, not to even.
        assertThat(CoverageCalculator.percent(new BigDecimal("1"), new BigDecimal("2000"))).isEqualByComparingTo("0.1");
    }

    @Test
    void countsUseTheSameRounding() {
        assertThat(CoverageCalculator.percent(9, 118)).isEqualByComparingTo("7.6");
        assertThat(CoverageCalculator.percent(0, 10)).isEqualByComparingTo("0.0");
    }

    @Test
    void anEmptyDenominatorHasNoPercentInsteadOfZero() {
        assertThat(CoverageCalculator.percent(BigDecimal.ZERO, BigDecimal.ZERO)).isNull();
        assertThat(CoverageCalculator.percent(BigDecimal.ONE, null)).isNull();
        assertThat(CoverageCalculator.percent(0, 0)).isNull();
    }

    @Test
    void areasKeepTwoDecimalsAndNullCountsAsZero() {
        assertThat(CoverageCalculator.area(new BigDecimal("1250.405"))).isEqualByComparingTo("1250.41").hasScaleOf(2);
        assertThat(CoverageCalculator.area(null)).isEqualByComparingTo("0.00").hasScaleOf(2);
    }
}
