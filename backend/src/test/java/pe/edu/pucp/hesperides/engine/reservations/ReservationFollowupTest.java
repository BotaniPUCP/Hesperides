package pe.edu.pucp.hesperides.engine.reservations;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/** SPEC-107 §8 (enmienda del 11 nov 2026): confirmación de uso y marca de uso del espacio. */
class ReservationFollowupTest {

    private static final Instant START = Instant.parse("2026-11-13T15:00:00Z"); // 10:00 en Lima
    private static final Instant END = Instant.parse("2026-11-13T19:00:00Z");   // 14:00 en Lima

    @Test
    void theCutoffIsMinutesBeforeTheEnd() {
        assertThat(ReservationFollowup.lateCutoff(END, 20))
                .isEqualTo(END.minusSeconds(20 * 60L));
        assertThat(ReservationFollowup.lateCutoff(END, 0)).isEqualTo(END);
    }

    @Test
    void confirmationIsOpenUntilTheCutoffAndClosedAfterIt() {
        Instant cutoff = ReservationFollowup.lateCutoff(END, 20);

        assertThat(ReservationFollowup.canConfirm(ReservationState.UPCOMING, END, START, 20)).isTrue();
        // Una hora antes del fin aún es antes del corte de 20 minutos.
        assertThat(ReservationFollowup.canConfirm(ReservationState.IN_PROGRESS, END, END.minusSeconds(3600), 20))
                .isTrue();
        // En el corte mismo ya cerró: el límite es estricto.
        assertThat(ReservationFollowup.canConfirm(ReservationState.IN_PROGRESS, END, cutoff, 20)).isFalse();
        assertThat(ReservationFollowup.canConfirm(ReservationState.IN_PROGRESS, END, cutoff.plusSeconds(1), 20))
                .isFalse();
    }

    @Test
    void aCancelledOrFinishedReservationCannotBeConfirmed() {
        assertThat(ReservationFollowup.canConfirm(ReservationState.CANCELLED, END, START, 20)).isFalse();
        assertThat(ReservationFollowup.canConfirm(ReservationState.FINISHED, END, START, 20)).isFalse();
    }

    @Test
    void usageIsRecordedOnlyInsideTheScheduleAndUntilTheCutoff() {
        // Con corte de 20 minutos: el horario va de 10:00 a 14:00, el corte es 13:40.
        assertThat(ReservationFollowup.canRecordUsage(START, END, null, START, 20)).isTrue();
        assertThat(ReservationFollowup.canRecordUsage(START, END, null, END.minusSeconds(3600), 20)).isTrue();
        // En el corte mismo ya cerró, como la confirmación.
        assertThat(ReservationFollowup.canRecordUsage(START, END, null,
                ReservationFollowup.lateCutoff(END, 20), 20)).isFalse();
        assertThat(ReservationFollowup.canRecordUsage(START, END, null,
                ReservationFollowup.lateCutoff(END, 20).plusSeconds(1), 20)).isFalse();
        assertThat(ReservationFollowup.canRecordUsage(START, END, null, END.minusSeconds(1), 20)).isFalse();
        assertThat(ReservationFollowup.canRecordUsage(START, END, null, START.minusSeconds(1), 20)).isFalse();
        assertThat(ReservationFollowup.canRecordUsage(START, END, START, START, 20)).isFalse();
    }

    @Test
    void aReservationShorterThanTheToleranceHasNoUsageWindow() {
        // De 10:00 a 10:15 con tolerancia de 20: el corte cae antes del inicio,
        // así que nunca se puede marcar, igual que no se puede confirmar.
        Instant quarterEnd = START.plusSeconds(15 * 60L);
        assertThat(ReservationFollowup.lateCutoff(quarterEnd, 20)).isBefore(START);
        assertThat(ReservationFollowup.canRecordUsage(START, quarterEnd, null, START.plusSeconds(60), 20))
                .isFalse();
    }

    @Test
    void theUsageDisplayCombinesTheClockAndTheMark() {
        assertThat(ReservationFollowup.usageDisplay(ReservationState.UPCOMING, false))
                .isEqualTo(ReservationUsage.NOT_RECORDED);
        assertThat(ReservationFollowup.usageDisplay(ReservationState.IN_PROGRESS, false))
                .isEqualTo(ReservationUsage.NOT_IN_USE);
        assertThat(ReservationFollowup.usageDisplay(ReservationState.IN_PROGRESS, true))
                .isEqualTo(ReservationUsage.IN_USE);
        assertThat(ReservationFollowup.usageDisplay(ReservationState.FINISHED, true))
                .isEqualTo(ReservationUsage.USED);
        assertThat(ReservationFollowup.usageDisplay(ReservationState.FINISHED, false))
                .isEqualTo(ReservationUsage.NOT_USED);
        assertThat(ReservationFollowup.usageDisplay(ReservationState.CANCELLED, true))
                .isEqualTo(ReservationUsage.NOT_RECORDED);
    }
}
