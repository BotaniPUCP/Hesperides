package pe.edu.pucp.hesperides.modules.reports.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Summary for the direction (SPEC-202 §3.5, D-16, D-18). Months travel as
 * {@code YYYY-MM}. Every indicator is a computed code; the ones without a source
 * travel with {@code available = false} and a reason code.
 */
public record DirectionReportResponse(
        String month,
        String previousMonth,
        String timeZone,
        boolean inProgress,
        Header header,
        List<Indicator> indicators,
        CoverageSeries coverageSeries,
        Instant generatedAt
) {
    public record Header(BigDecimal greenAreaM2, BigDecimal campusHectares, int sections, long activeTeams) {
    }

    /**
     * {@code unit} is PERCENT or COUNT; {@code trend} UP, DOWN or FLAT;
     * {@code higherIsBetter} null means the variation is neither good nor bad.
     */
    public record Indicator(String code, String unit, boolean available, String unavailableReason,
                            BigDecimal value, BigDecimal previousValue, BigDecimal delta, String trend,
                            Boolean higherIsBetter, BigDecimal target, String targetReason,
                            BigDecimal progress, boolean provisional) {
    }

    public record CoverageSeries(BigDecimal target, List<SeriesPoint> points) {
    }

    /** A month without approved work on the campus is a gap, not 0 %. */
    public record SeriesPoint(String month, BigDecimal percent, boolean recorded) {
    }
}
