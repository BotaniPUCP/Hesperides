package pe.edu.pucp.hesperides.engine.reporting;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Month-over-month variation and progress against a target (SPEC-202 §3.6,
 * "Resumen para OSG"). Pure: the indicator's unit and sense are the caller's.
 *
 * <ul>
 *   <li>{@code delta} is in points for a percent and in units for a count, and
 *       does not exist when either value is missing.</li>
 *   <li>{@code trend} is FLAT when the delta rounded to one decimal is zero.</li>
 *   <li>{@code progress} is capped at 100: the real figure is shown apart.</li>
 * </ul>
 */
public final class TrendCalculator {

    public enum Trend { UP, DOWN, FLAT }

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private TrendCalculator() {
    }

    public static BigDecimal delta(BigDecimal value, BigDecimal previous) {
        if (value == null || previous == null) {
            return null;
        }
        return value.subtract(previous);
    }

    public static Trend trend(BigDecimal delta) {
        if (delta == null) {
            return null;
        }
        int sign = delta.setScale(1, RoundingMode.HALF_UP).signum();
        return sign > 0 ? Trend.UP : sign < 0 ? Trend.DOWN : Trend.FLAT;
    }

    /** {@code min(value / target × 100, 100)} with one decimal; null without a positive target. */
    public static BigDecimal progress(BigDecimal value, BigDecimal target) {
        if (value == null || target == null || target.signum() <= 0) {
            return null;
        }
        BigDecimal raw = value.multiply(HUNDRED).divide(target, 1, RoundingMode.HALF_UP);
        return raw.min(HUNDRED.setScale(1, RoundingMode.UNNECESSARY)).max(BigDecimal.ZERO.setScale(1));
    }
}
