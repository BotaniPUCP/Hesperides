package pe.edu.pucp.hesperides.engine.reporting;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

/**
 * Period boundaries of the reports (SPEC-202 D-14). Pure: the zone and the clock
 * come from the caller, so a test fixes both and the boundaries never depend on
 * the machine that runs the query.
 *
 * <p>Weeks run from Monday to Sunday because the client's irrigation and work
 * schedule run from Monday to Saturday.
 */
public final class ReportPeriods {

    /** Longest accepted range, inclusive: a leap year fits exactly. */
    public static final int MAX_RANGE_DAYS = 366;

    private ReportPeriods() {
    }

    public static LocalDate today(Clock clock, ZoneId zone) {
        return LocalDate.now(clock.withZone(zone));
    }

    /** The civil date of an instant: a work completed at 02:00 UTC on Nov 1 is Oct 31 in Lima. */
    public static LocalDate civilDate(Instant instant, ZoneId zone) {
        return instant.atZone(zone).toLocalDate();
    }

    public static LocalDate weekStartOf(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    public static LocalDate weekEnd(LocalDate weekStart) {
        return weekStart.plusDays(6);
    }

    public static boolean isMonday(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.MONDAY;
    }

    /** The summary is delivered at month end, so its default is the month that already closed. */
    public static YearMonth lastClosedMonth(LocalDate today) {
        return YearMonth.from(today).minusMonths(1);
    }

    public static DateRange month(YearMonth month) {
        return new DateRange(month.atDay(1), month.atEndOfMonth());
    }

    public static DateRange currentMonth(LocalDate today) {
        return month(YearMonth.from(today));
    }

    public static long lengthInDays(DateRange range) {
        return ChronoUnit.DAYS.between(range.from(), range.to()) + 1;
    }

    public static boolean exceedsMaxRange(DateRange range) {
        return lengthInDays(range) > MAX_RANGE_DAYS;
    }
}
