package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentBusinessCalendar;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;

class IncidentBusinessCalendarTest {
    private final IncidentBusinessCalendar calendar = new IncidentBusinessCalendar("America/Lima", "2026-12-25");

    @Test void countsBothBusinessDayEndpoints() {
        assertThat(calendar.count(Instant.parse("2026-11-02T15:00:00Z"), Instant.parse("2026-11-02T18:00:00Z"))).isEqualTo(1);
        assertThat(calendar.count(Instant.parse("2026-11-02T15:00:00Z"), Instant.parse("2026-11-03T18:00:00Z"))).isEqualTo(2);
    }

    @Test void skipsWeekendsHolidaysAndDoesNotDoubleSubtract() {
        assertThat(calendar.count(Instant.parse("2026-12-24T15:00:00Z"), Instant.parse("2026-12-28T18:00:00Z"))).isEqualTo(2);
        assertThat(calendar.count(Instant.parse("2026-11-07T15:00:00Z"), Instant.parse("2026-11-08T18:00:00Z"))).isZero();
        var weekendHoliday = new IncidentBusinessCalendar("America/Lima", "2026-11-07,2026-11-07");
        assertThat(weekendHoliday.count(Instant.parse("2026-11-06T15:00:00Z"), Instant.parse("2026-11-09T18:00:00Z"))).isEqualTo(2);
    }

    @Test void usesInstitutionalDatesRatherThanUtcOrSystemZone() {
        assertThat(calendar.count(Instant.parse("2026-11-03T02:00:00Z"), Instant.parse("2026-11-03T04:00:00Z"))).isEqualTo(1);
        assertThat(calendar.count(Instant.parse("2026-11-03T04:00:00Z"), Instant.parse("2026-11-03T06:00:00Z"))).isEqualTo(2);
    }

    @Test void rejectsReversedDatesAndInvalidConfiguration() {
        assertThatThrownBy(() -> calendar.count(Instant.parse("2026-11-03T15:00:00Z"), Instant.parse("2026-11-02T15:00:00Z")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new IncidentBusinessCalendar("America/Lima", "invalid")).isInstanceOf(java.time.DateTimeException.class);
    }
}
