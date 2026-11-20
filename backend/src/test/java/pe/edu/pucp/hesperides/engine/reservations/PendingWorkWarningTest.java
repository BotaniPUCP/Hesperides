package pe.edu.pucp.hesperides.engine.reservations;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.reservations.PendingWorkWarning.Work;
import pe.edu.pucp.hesperides.engine.reservations.PendingWorkWarning.Wording;

class PendingWorkWarningTest {

    private static final String ACTIVITY = "Mantenimiento · Poda (INT-0007)";
    private static final LocalDate RESERVATION_DAY = LocalDate.of(2026, 11, 19);
    private static final LocalDate EARLIER_TODAY = LocalDate.of(2026, 11, 10);

    private static Work here(LocalDate workDay, boolean started, LocalDate today) {
        return new Work("Rosales", ACTIVITY, null, workDay, started, RESERVATION_DAY, today);
    }

    private static Work nearby(LocalDate workDay, boolean started) {
        return new Work("Palmeras", ACTIVITY, 6L, workDay, started, RESERVATION_DAY, EARLIER_TODAY);
    }

    @Nested
    class SameDay {

        @Test
        void workInTheGardenSaysTheyMayBeWorkingDuringTheReservation() {
            Wording wording = PendingWorkWarning.describe(here(RESERVATION_DAY, false, EARLIER_TODAY));

            assertThat(wording.text()).isEqualTo("Rosales tiene trabajo por hacer de " + ACTIVITY
                    + ", programada el 19 nov: pueden estar trabajando durante la reserva");
            assertThat(wording.emphasis()).isNull();
        }

        @Test
        void nearbyWorkSaysTheDistance() {
            Wording wording = PendingWorkWarning.describe(nearby(RESERVATION_DAY, true));

            assertThat(wording.text()).isEqualTo("A 6 m, Palmeras tiene trabajo por hacer de " + ACTIVITY
                    + ", empezó el 19 nov");
            assertThat(wording.emphasis()).isNull();
        }
    }

    @Nested
    class StartedBefore {

        @Test
        void startedAWeekEarlierExplainsItAndStressesTheReservationDay() {
            Wording wording = PendingWorkWarning.describe(here(RESERVATION_DAY.minusDays(7), true, EARLIER_TODAY));

            assertThat(wording.text()).isEqualTo("Rosales tiene trabajo por hacer de " + ACTIVITY
                    + ": empezó el 12 nov, una semana antes de la reserva, y todavía no se marca como terminada en este jardín.");
            assertThat(wording.emphasis()).isEqualTo("El 19 nov podrían estar trabajando en este jardín.");
        }

        @Test
        void aReservationForTodaySaysToday() {
            Wording wording = PendingWorkWarning.describe(here(RESERVATION_DAY.minusDays(7), true, RESERVATION_DAY));

            assertThat(wording.emphasis()).isEqualTo("Hoy podrían estar trabajando en este jardín.");
        }

        @Test
        void neverStartedWorkSaysItWasScheduled() {
            Wording wording = PendingWorkWarning.describe(here(RESERVATION_DAY.minusDays(3), false, EARLIER_TODAY));

            assertThat(wording.text()).contains(": estaba programada para el 16 nov, 3 días antes de la reserva,");
        }

        @Test
        void nearbyWorkTalksAboutThatOtherGarden() {
            Wording wording = PendingWorkWarning.describe(nearby(RESERVATION_DAY.minusDays(1), true));

            assertThat(wording.text()).isEqualTo("A 6 m, Palmeras tiene trabajo por hacer de " + ACTIVITY
                    + ": empezó el 18 nov, un día antes de la reserva, y todavía no se marca como terminada allí.");
            assertThat(wording.emphasis()).isEqualTo("El 19 nov podrían estar trabajando en ese jardín.");
        }

        @Test
        void wholeWeeksAreCountedInWeeksAndTheRestInDays() {
            assertThat(PendingWorkWarning.describe(here(RESERVATION_DAY.minusDays(14), true, EARLIER_TODAY)).text())
                    .contains(", 2 semanas antes de la reserva,");
            assertThat(PendingWorkWarning.describe(here(RESERVATION_DAY.minusDays(10), true, EARLIER_TODAY)).text())
                    .contains(", 10 días antes de la reserva,");
        }
    }
}
