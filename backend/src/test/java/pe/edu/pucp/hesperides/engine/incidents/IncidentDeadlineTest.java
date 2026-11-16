package pe.edu.pucp.hesperides.engine.incidents;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IncidentDeadlineTest {

    private static final DeadlinePolicy POLICY = new DeadlinePolicy(24, 48, 72);
    private static final Instant RECEIVED = Instant.parse("2026-11-16T08:00:00Z");

    @Test
    void ownStaffGetsHoursByUrgency() {
        assertThat(POLICY.allowed("HIGH", false, null)).isEqualTo(Duration.ofHours(24));
        assertThat(POLICY.allowed("MEDIUM", false, null)).isEqualTo(Duration.ofHours(48));
        assertThat(POLICY.allowed("LOW", false, null)).isEqualTo(Duration.ofHours(72));
    }

    @Test
    void thirdPartyGetsTheAgreedDaysWhateverTheUrgency() {
        assertThat(POLICY.allowed("HIGH", true, 10)).isEqualTo(Duration.ofDays(10));
    }

    @Test
    void thirdPartyWithoutAgreedDaysFailsFast() {
        assertThatThrownBy(() -> POLICY.allowed("HIGH", true, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unknownUrgencyFailsFast() {
        assertThatThrownBy(() -> POLICY.allowed("CRITICAL", false, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nonPositiveHoursAreRejected() {
        assertThatThrownBy(() -> new DeadlinePolicy(0, 48, 72)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void onTimeBeforeTheLastQuarter() {
        Instant now = RECEIVED.plus(Duration.ofHours(17).plusMinutes(59));
        assertThat(IncidentDeadline.status(RECEIVED, Duration.ofHours(24), now)).isEqualTo(DeadlineStatus.ON_TIME);
    }

    @Test
    void dueSoonInTheLastQuarterIncludingTheDueInstant() {
        Duration allowed = Duration.ofHours(24);
        assertThat(IncidentDeadline.status(RECEIVED, allowed, RECEIVED.plus(Duration.ofHours(18))))
                .isEqualTo(DeadlineStatus.DUE_SOON);
        assertThat(IncidentDeadline.status(RECEIVED, allowed, RECEIVED.plus(allowed)))
                .isEqualTo(DeadlineStatus.DUE_SOON);
    }

    @Test
    void overdueAfterTheDueInstant() {
        Instant now = RECEIVED.plus(Duration.ofHours(24)).plusSeconds(1);
        assertThat(IncidentDeadline.status(RECEIVED, Duration.ofHours(24), now)).isEqualTo(DeadlineStatus.OVERDUE);
    }

    @Test
    void closingOnOrBeforeTheDueInstantMeetsTheDeadline() {
        Duration allowed = Duration.ofHours(24);
        assertThat(IncidentDeadline.met(RECEIVED, allowed, RECEIVED.plus(allowed))).isTrue();
        assertThat(IncidentDeadline.met(RECEIVED, allowed, RECEIVED.plus(allowed).plusSeconds(1))).isFalse();
    }

    @Test
    void dueAtIsReceptionPlusAllowed() {
        assertThat(IncidentDeadline.dueAt(RECEIVED, Duration.ofHours(48)))
                .isEqualTo(Instant.parse("2026-11-18T08:00:00Z"));
    }
}
