package pe.edu.pucp.hesperides.modules.reports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse.Indicator;
import pe.edu.pucp.hesperides.modules.reports.service.DirectionIndicators.Measure;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-202 D-16 and §3.6 "Resumen para OSG". */
class DirectionIndicatorsTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    @Test
    void aPercentWithTargetCarriesDeltaTrendAndCappedProgress() {
        Indicator coverage = DirectionIndicators.withTarget("COVERAGE", new Measure(d("62.9"), d("58.1")), d("80"), true);

        assertThat(coverage.delta()).isEqualByComparingTo("4.8");
        assertThat(coverage.trend()).isEqualTo("UP");
        assertThat(coverage.higherIsBetter()).isTrue();
        assertThat(coverage.target()).isEqualByComparingTo("80");
        assertThat(coverage.targetReason()).isNull();
        assertThat(coverage.progress()).isEqualByComparingTo("78.6");
        assertThat(coverage.provisional()).isTrue();
    }

    @Test
    void aMissingTargetParameterIsReportedAndLeavesNoProgress() {
        Indicator coverage = DirectionIndicators.withTarget("COVERAGE", new Measure(d("50"), null), null, true);

        assertThat(coverage.target()).isNull();
        assertThat(coverage.targetReason()).isEqualTo("TARGET_NOT_STORED");
        assertThat(coverage.progress()).isNull();
        assertThat(coverage.delta()).isNull();
        assertThat(coverage.trend()).isNull();
    }

    @Test
    void resolvedIncidentsHaveNoSenseAndNoTarget() {
        Indicator resolved = DirectionIndicators.neutralCount("RESOLVED_INCIDENTS", new Measure(d("9"), d("6")));

        assertThat(resolved.higherIsBetter()).isNull();
        assertThat(resolved.targetReason()).isEqualTo("NO_TARGET");
        assertThat(resolved.trend()).isEqualTo("UP");
    }

    @Test
    void theFourIndicatorsWithoutSourceAreUnavailableWithTheirReason() {
        assertThat(DirectionIndicators.unavailable())
                .extracting(Indicator::code, Indicator::available, Indicator::unavailableReason, Indicator::value)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("IRRIGATION_CYCLES", false, "RULE_NOT_DEFINED", null),
                        org.assertj.core.groups.Tuple.tuple("PHYTOSANITARY_CONTROLS", false, "UNIT_NOT_MODELED", null),
                        org.assertj.core.groups.Tuple.tuple("MAJOR_PRUNING", false, "NOT_RECORDED", null),
                        org.assertj.core.groups.Tuple.tuple("HIGH_URGENCY_ON_TIME", false, "NO_DEADLINES_CONFIGURED", null));
    }
}
