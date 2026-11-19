package pe.edu.pucp.hesperides.modules.reports.service;

import pe.edu.pucp.hesperides.engine.reporting.TrendCalculator;
import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse.Indicator;

import java.math.BigDecimal;
import java.util.List;

/**
 * The closed list of indicators of the direction summary (SPEC-202 D-16). Each
 * code exists because the backend knows how to compute it; the ones without a
 * source travel as unavailable with a reason, never with an invented figure.
 */
final class DirectionIndicators {

    static final String PERCENT = "PERCENT";
    static final String COUNT = "COUNT";
    static final String NO_TARGET = "NO_TARGET";
    static final String TARGET_NOT_STORED = "TARGET_NOT_STORED";

    private DirectionIndicators() {
    }

    /** A measured value of the month, the previous one and their target. */
    record Measure(BigDecimal value, BigDecimal previous) {
    }

    /**
     * A percent with a target read from the parameters: without the parameter
     * the target is missing (TARGET_NOT_STORED) and there is no progress.
     */
    static Indicator withTarget(String code, Measure m, BigDecimal target, boolean provisional) {
        BigDecimal delta = TrendCalculator.delta(m.value(), m.previous());
        return new Indicator(code, PERCENT, true, null, m.value(), m.previous(), delta, trend(delta), true,
                target, target == null ? TARGET_NOT_STORED : null,
                TrendCalculator.progress(m.value(), target), provisional);
    }

    /** A count whose variation is neither good nor bad by itself: neutral color. */
    static Indicator neutralCount(String code, Measure m) {
        BigDecimal delta = TrendCalculator.delta(m.value(), m.previous());
        return new Indicator(code, COUNT, true, null, m.value(), m.previous(), delta, trend(delta), null,
                null, NO_TARGET, null, false);
    }

    /** A count that should grow but whose target is not stored in the database (§2.6 row 26). */
    static Indicator countWithoutStoredTarget(String code, Measure m) {
        BigDecimal delta = TrendCalculator.delta(m.value(), m.previous());
        return new Indicator(code, COUNT, true, null, m.value(), m.previous(), delta, trend(delta), true,
                null, TARGET_NOT_STORED, null, false);
    }

    /** The four indicators the client asked for and the system cannot compute yet (§9 "Por validar"). */
    static List<Indicator> unavailable() {
        return List.of(
                missing("IRRIGATION_CYCLES", COUNT, "RULE_NOT_DEFINED"),
                missing("PHYTOSANITARY_CONTROLS", COUNT, "UNIT_NOT_MODELED"),
                missing("MAJOR_PRUNING", COUNT, "NOT_RECORDED"),
                missing("HIGH_URGENCY_ON_TIME", PERCENT, "NO_DEADLINES_CONFIGURED"));
    }

    private static Indicator missing(String code, String unit, String reason) {
        return new Indicator(code, unit, false, reason, null, null, null, null, true, null, null, null, false);
    }

    private static String trend(BigDecimal delta) {
        TrendCalculator.Trend trend = TrendCalculator.trend(delta);
        return trend == null ? null : trend.name();
    }
}
