package pe.edu.pucp.hesperides.engine.campusevents;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-114 §8: las ocurrencias de un evento y a qué jardines toca. */
class CampusEventEngineTest {

    private static final LocalDate MAR_18 = LocalDate.of(2027, 3, 18);
    private static final LocalDate JUL_1 = LocalDate.of(2027, 7, 1);

    private static EventRule everyDay(LocalDate from, LocalDate to) {
        return new EventRule(from, to, Set.of(), null, null);
    }

    @Test
    void withoutRepetitionItHappensEveryDayOfItsDates() {
        var rule = everyDay(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 3));

        assertThat(EventOccurrences.datesIn(rule, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 31)))
                .containsExactly(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 3));
    }

    @Test
    void thursdaysOfTheSemesterAreSixteen() {
        var rule = new EventRule(MAR_18, JUL_1, Set.of(DayOfWeek.THURSDAY), LocalTime.of(14, 0), LocalTime.of(18, 0));

        var dates = EventOccurrences.datesIn(rule, MAR_18, JUL_1);

        assertThat(dates).hasSize(16).first().isEqualTo(MAR_18);
        assertThat(dates).allMatch(d -> d.getDayOfWeek() == DayOfWeek.THURSDAY);
    }

    @Test
    void aRangeInTheMiddleOnlyGivesWhatFallsInside() {
        var rule = new EventRule(MAR_18, JUL_1, Set.of(DayOfWeek.THURSDAY), null, null);

        assertThat(EventOccurrences.datesIn(rule, LocalDate.of(2027, 4, 1), LocalDate.of(2027, 4, 10)))
                .containsExactly(LocalDate.of(2027, 4, 1), LocalDate.of(2027, 4, 8));
    }

    @Test
    void repetitionWithoutAnyDayInsideItsDatesHasNoOccurrence() {
        // Del miércoles 17 al lunes 22 de marzo de 2027 no hay ningún martes.
        var rule = new EventRule(LocalDate.of(2027, 3, 17), LocalDate.of(2027, 3, 22), Set.of(DayOfWeek.TUESDAY), null, null);

        assertThat(EventOccurrences.hasAny(rule)).isFalse();
    }

    @Test
    void hoursCrossOnlyWhenTheyOverlap() {
        var afternoon = new EventRule(MAR_18, MAR_18, Set.of(), LocalTime.of(14, 0), LocalTime.of(18, 0));

        assertThat(EventOccurrences.crosses(afternoon, LocalTime.of(10, 0), LocalTime.of(12, 0))).isFalse();
        assertThat(EventOccurrences.crosses(afternoon, LocalTime.of(15, 0), LocalTime.of(17, 0))).isTrue();
        assertThat(EventOccurrences.crosses(afternoon, null, null)).isTrue();
        assertThat(EventOccurrences.crosses(everyDay(MAR_18, MAR_18), LocalTime.of(8, 0), LocalTime.of(9, 0))).isTrue();
    }

    @Test
    void theCampusTouchesEveryGardenASectorOnlyItsOwnAndASectionOnlyItself() {
        var garden = new Garden(10L, 2L);

        assertThat(EventReach.touches(EventScope.CAMPUS, null, garden)).isTrue();
        assertThat(EventReach.touches(EventScope.SECTOR, 2L, garden)).isTrue();
        assertThat(EventReach.touches(EventScope.SECTOR, 3L, garden)).isFalse();
        assertThat(EventReach.touches(EventScope.SECTION, 10L, garden)).isTrue();
        assertThat(EventReach.touches(EventScope.SECTION, 11L, garden)).isFalse();
    }
}
