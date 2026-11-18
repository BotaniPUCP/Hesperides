package pe.edu.pucp.hesperides.engine.machinery;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-115 §8: los días válidos para la maquinaria de corte. */
class MachineryDaysTest {

    private static final LocalDate SATURDAY = LocalDate.of(2026, 11, 21);
    private static final LocalDate SUNDAY = LocalDate.of(2026, 11, 22);
    private static final LocalDate TUESDAY = LocalDate.of(2026, 11, 24);

    @Test
    void weekendsAreValidAndAWeekdayIsNot() {
        assertThat(MachineryDays.allowed(SATURDAY, Set.of())).isTrue();
        assertThat(MachineryDays.allowed(SUNDAY, Set.of())).isTrue();
        assertThat(MachineryDays.allowed(TUESDAY, Set.of())).isFalse();
    }

    @Test
    void aWeekdayHolidayIsValid() {
        assertThat(MachineryDays.allowed(TUESDAY, Set.of(TUESDAY))).isTrue();
    }
}
