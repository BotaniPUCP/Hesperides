package pe.edu.pucp.hesperides.modules.interventions.service;

import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import static org.assertj.core.api.Assertions.*;

class InterventionExecutionScheduleTest {
    @Test void midnightUtcDoesNotStartTheNextCampusDay() {
        var policy=new InterventionExecutionSchedule(Clock.fixed(Instant.parse("2026-11-06T00:30:00Z"),ZoneId.of("America/Lima")));
        assertThat(policy.canExecute(LocalDate.of(2026,11,5))).isTrue();
        assertThat(policy.canExecute(LocalDate.of(2026,11,6))).isFalse();
        assertThatThrownBy(()->policy.requireAvailable(LocalDate.of(2026,11,6))).isInstanceOf(BusinessRuleException.class);
    }

    @Test void executionIsAvailableFromThePlannedCivilDayAndAfterwards() {
        var policy=new InterventionExecutionSchedule(Clock.fixed(Instant.parse("2026-11-06T05:00:00Z"),ZoneId.of("America/Lima")));
        assertThatCode(()->policy.requireAvailable(LocalDate.of(2026,11,6))).doesNotThrowAnyException();
        assertThatCode(()->policy.requireAvailable(LocalDate.of(2026,11,5))).doesNotThrowAnyException();
    }
}
