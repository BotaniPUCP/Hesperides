package pe.edu.pucp.hesperides.engine.reservations;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

/** SPEC-107 §8: estado calculado, cruce de horarios y días locales. */
class ReservationPeriodTest {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final Instant START = Instant.parse("2026-11-13T15:00:00Z"); // 10:00 en Lima
    private static final Instant END = Instant.parse("2026-11-13T19:00:00Z");   // 14:00 en Lima

    @Test
    void stateChangesWithTheClockAndCancellationWins() {
        assertThat(ReservationPeriod.state(START, END, null, START.minusSeconds(1)))
                .isEqualTo(ReservationState.UPCOMING);
        assertThat(ReservationPeriod.state(START, END, null, START))
                .isEqualTo(ReservationState.IN_PROGRESS);
        assertThat(ReservationPeriod.state(START, END, null, END.minusSeconds(1)))
                .isEqualTo(ReservationState.IN_PROGRESS);
        assertThat(ReservationPeriod.state(START, END, null, END))
                .isEqualTo(ReservationState.FINISHED);
        assertThat(ReservationPeriod.state(START, END, END.minusSeconds(60), START))
                .isEqualTo(ReservationState.CANCELLED);
    }

    @Test
    void theEndIsExclusiveSoAdjacentReservationsDoNotOverlap() {
        Instant thirteen = Instant.parse("2026-11-13T18:00:00Z");
        Instant fifteen = Instant.parse("2026-11-13T20:00:00Z");

        assertThat(ReservationPeriod.overlaps(START, END, thirteen, fifteen)).isTrue();
        assertThat(ReservationPeriod.overlaps(START, END, END, fifteen)).isFalse();
    }

    @Test
    void aReservationGoesFromOneHourToAnotherOnTheSameDay() {
        assertThat(ReservationPeriod.withinOneDay(START, END, LIMA)).isTrue();
    }

    @Test
    void aReservationThatCrossesMidnightIsNotOneDay() {
        Instant start = Instant.parse("2026-11-14T04:00:00Z"); // 13 nov 23:00 en Lima
        Instant end = Instant.parse("2026-11-14T06:00:00Z");   // 14 nov 01:00 en Lima

        assertThat(ReservationPeriod.withinOneDay(start, end, LIMA)).isFalse();
    }

    @Test
    void aReservationThatEndsExactlyAtMidnightStaysInItsDay() {
        Instant start = Instant.parse("2026-11-13T23:00:00Z"); // 13 nov 18:00 en Lima
        Instant end = Instant.parse("2026-11-14T05:00:00Z");   // 14 nov 00:00 en Lima

        assertThat(ReservationPeriod.withinOneDay(start, end, LIMA)).isTrue();
        assertThat(ReservationPeriod.day(start, LIMA)).isEqualTo(LocalDate.of(2026, 11, 13));
    }
}
