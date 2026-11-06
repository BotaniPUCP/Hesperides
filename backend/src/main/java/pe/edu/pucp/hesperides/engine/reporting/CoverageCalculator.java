package pe.edu.pucp.hesperides.engine.reporting;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Percentages and areas of the reports (SPEC-202 §3.6). One rule for every
 * figure: a percent has one decimal rounded half-up, and it does not exist when
 * there is nothing to divide by. A null percent and 0.0 mean different things:
 * "no sections to measure" is not "nothing was done".
 */
public final class CoverageCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private CoverageCalculator() {
    }

    public static BigDecimal percent(BigDecimal part, BigDecimal total) {
        if (total == null || total.signum() <= 0) {
            return null;
        }
        BigDecimal safePart = part == null ? BigDecimal.ZERO : part;
        return safePart.multiply(HUNDRED).divide(total, 1, RoundingMode.HALF_UP);
    }

    public static BigDecimal percent(long part, long total) {
        return percent(BigDecimal.valueOf(part), BigDecimal.valueOf(total));
    }

    /** Areas travel with two decimals; a missing sum is an empty area. */
    public static BigDecimal area(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
