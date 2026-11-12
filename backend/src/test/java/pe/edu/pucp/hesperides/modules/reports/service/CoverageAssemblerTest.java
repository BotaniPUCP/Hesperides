package pe.edu.pucp.hesperides.modules.reports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.Attendance;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-202 §3.6 and D-11: ordering and caps of the section lists. */
class CoverageAssemblerTest {

    private static final DateRange OCTOBER = new DateRange(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));

    private static SectionRef section(long id, String code, String area) {
        return new SectionRef(id, code, "Sección " + code, area == null ? null : new BigDecimal(area),
                1L, "SEC-1", "Sector 1");
    }

    private static Attendance on(long section, long work, int month, int day) {
        return new Attendance(section, work, LocalDate.of(2026, month, day));
    }

    @Test
    void onlyAttendanceInsideThePeriodCoversButEarlierAttentionIsRemembered() {
        var stats = CoverageAssembler.stats(List.of(section(1, "A", "100"), section(2, "B", "100")),
                List.of(on(1, 10, 9, 20), on(2, 11, 10, 3), on(2, 12, 9, 1)), OCTOBER);

        assertThat(stats.get(1L).covered()).isFalse();
        assertThat(stats.get(1L).lastAttendedOn()).isEqualTo(LocalDate.of(2026, 9, 20));
        assertThat(stats.get(2L).works()).containsExactly(11L);
        assertThat(stats.get(2L).lastAttendedOn()).isEqualTo(LocalDate.of(2026, 10, 3));
    }

    @Test
    void mostAttendedOrdersByWorksThenAreaThenCode() {
        var stats = CoverageAssembler.stats(
                List.of(section(1, "C", "100"), section(2, "B", "500"), section(3, "A", "500"), section(4, "D", null)),
                List.of(on(1, 1, 10, 1), on(1, 2, 10, 2), on(2, 3, 10, 3), on(3, 4, 10, 4), on(4, 5, 10, 5)),
                OCTOBER);

        var top = CoverageAssembler.mostAttended(stats.values());

        assertThat(top.total()).isEqualTo(4);
        assertThat(top.items()).extracting(row -> row.code()).containsExactly("C", "A", "B", "D");
        assertThat(top.items().get(0).approvedInterventions()).isEqualTo(2);
    }

    @Test
    void unattendedShowsNeverAttendedFirstThenTheOldestThenTheLargest() {
        var stats = CoverageAssembler.stats(
                List.of(section(1, "A", "100"), section(2, "B", "900"), section(3, "C", "100"), section(4, "D", "50")),
                List.of(on(3, 1, 9, 10), on(4, 2, 8, 1)), OCTOBER);

        var unattended = CoverageAssembler.unattended(stats.values());

        assertThat(unattended.items()).extracting(row -> row.code()).containsExactly("B", "A", "D", "C");
        assertThat(unattended.items().get(0).lastAttendedOn()).isNull();
        assertThat(unattended.items().get(2).lastAttendedOn()).isEqualTo(LocalDate.of(2026, 8, 1));
    }

    @Test
    void listsAreCappedAtTenWithTheirExactTotal() {
        List<SectionRef> sections = new ArrayList<>();
        for (long id = 1; id <= 12; id++) {
            sections.add(section(id, "S" + (100 + id), "10"));
        }

        var unattended = CoverageAssembler.unattended(CoverageAssembler.stats(sections, List.of(), OCTOBER).values());

        assertThat(unattended.total()).isEqualTo(12);
        assertThat(unattended.items()).hasSize(10);
    }

    @Test
    void sectionsWithoutSectorAreNamedAsSuch() {
        var orphan = new SectionRef(9L, "X", "Xerofítica", null, null, null, null);

        var row = CoverageAssembler.unattended(CoverageAssembler.stats(List.of(orphan), List.of(), OCTOBER).values())
                .items().get(0);

        assertThat(row.sectorName()).isEqualTo("Sin sector");
        assertThat(row.areaM2()).isNull();
    }
}
