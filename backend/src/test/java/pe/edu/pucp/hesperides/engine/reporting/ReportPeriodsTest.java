package pe.edu.pucp.hesperides.engine.reporting;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-202 D-14 and CA-M06: civil dates, weeks and months in the configured zone. */
class ReportPeriodsTest {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    @Test
    void anExecutionAtTwoUtcOnTheFirstBelongsToTheLastDayOfThePreviousMonthInLima() {
        LocalDate civil = ReportPeriods.civilDate(Instant.parse("2026-11-01T02:00:00Z"), LIMA);

        assertThat(civil).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(ReportPeriods.weekStartOf(civil)).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(YearMonth.from(civil)).isEqualTo(YearMonth.of(2026, 10));
    }

    @Test
    void aWeekRunsFromMondayToSunday() {
        LocalDate wednesday = LocalDate.of(2026, 10, 28);

        assertThat(ReportPeriods.weekStartOf(wednesday)).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(ReportPeriods.weekStartOf(LocalDate.of(2026, 11, 1))).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(ReportPeriods.weekEnd(LocalDate.of(2026, 10, 26))).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(ReportPeriods.isMonday(LocalDate.of(2026, 10, 26))).isTrue();
        assertThat(ReportPeriods.isMonday(wednesday)).isFalse();
    }

    @Test
    void theLastClosedMonthOfJanuaryIsDecemberOfThePreviousYear() {
        assertThat(ReportPeriods.lastClosedMonth(LocalDate.of(2026, 1, 15))).isEqualTo(YearMonth.of(2025, 12));
        assertThat(ReportPeriods.lastClosedMonth(LocalDate.of(2026, 11, 4))).isEqualTo(YearMonth.of(2026, 10));
    }

    @Test
    void aMonthCoversItsFirstAndLastCivilDay() {
        DateRange february = ReportPeriods.month(YearMonth.of(2028, 2));

        assertThat(february.from()).isEqualTo(LocalDate.of(2028, 2, 1));
        assertThat(february.to()).isEqualTo(LocalDate.of(2028, 2, 29));
        assertThat(ReportPeriods.currentMonth(LocalDate.of(2026, 11, 4)))
                .isEqualTo(new DateRange(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30)));
    }

    @Test
    void aRangeIsInclusiveAndAtMostThreeHundredSixtySixDays() {
        assertThat(ReportPeriods.lengthInDays(new DateRange(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 1))))
                .isEqualTo(1);
        assertThat(ReportPeriods.exceedsMaxRange(new DateRange(LocalDate.of(2028, 1, 1), LocalDate.of(2028, 12, 31))))
                .isFalse();
        assertThat(ReportPeriods.exceedsMaxRange(new DateRange(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1))))
                .isFalse();
        assertThat(ReportPeriods.exceedsMaxRange(new DateRange(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 2))))
                .isTrue();
    }

    @Test
    void todayIsTheCivilDateOfTheClockInTheZone() {
        var clock = java.time.Clock.fixed(Instant.parse("2026-11-02T03:00:00Z"), java.time.ZoneOffset.UTC);

        assertThat(ReportPeriods.today(clock, LIMA)).isEqualTo(LocalDate.of(2026, 11, 1));
    }
}
