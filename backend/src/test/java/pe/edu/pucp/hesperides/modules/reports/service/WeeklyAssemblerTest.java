package pe.edu.pucp.hesperides.modules.reports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse.WorkRow;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;
import pe.edu.pucp.hesperides.modules.reports.repository.WeeklyIncidentQueries.IncidentRow;
import pe.edu.pucp.hesperides.modules.reports.repository.WeeklyWorkQueries.WorkLocationRow;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-202 §3.3 and §3.6 "Semanal": caps, order, places of the sector and truncation. */
class WeeklyAssemblerTest {

    private static final LocalDate MON = LocalDate.of(2026, 10, 26);

    private static WorkLocationRow row(long work, Long type, String typeLabel, Long zone, Long place, String label) {
        return new WorkLocationRow(work, "INT-" + work, "Poda", type, typeLabel, MON.plusDays(2), MON.plusDays(3),
                zone, place == null ? label : "Sección", place, place == null ? null : label);
    }

    @Test
    void aWorkIsListedOnceWithEachOfItsPlacesOnce() {
        List<WorkRow> works = WeeklyAssembler.works(List.of(
                row(1, 30L, "Poda de mantenimiento", 50L, null, "Jardín Frutas"),
                row(1, 30L, "Poda de mantenimiento", 50L, null, "Jardín Frutas"),
                row(1, 30L, "Poda de mantenimiento", null, 7L, "Pontódromo")));

        assertThat(works).hasSize(1);
        assertThat(works.get(0).places()).extracting("kind", "label")
                .containsExactly(org.assertj.core.groups.Tuple.tuple("ZONE", "Jardín Frutas"),
                        org.assertj.core.groups.Tuple.tuple("PLACE", "Pontódromo"));
    }

    @Test
    void typesAreCountedPerWorkAndSortedByCount() {
        var rows = List.of(
                row(1, 41L, "Deshierbo", 50L, null, "A"),
                row(2, 41L, "Deshierbo", 51L, null, "B"),
                row(3, 30L, "Poda de mantenimiento", 50L, null, "A"));
        var types = WeeklyAssembler.byType(WeeklyAssembler.works(rows), rows);

        assertThat(types).extracting("typeLabel", "approved")
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Deshierbo", 2L),
                        org.assertj.core.groups.Tuple.tuple("Poda de mantenimiento", 1L));
        assertThat(types.get(0).places()).containsExactly("A", "B");
    }

    @Test
    void theListOfWorksIsCappedAtFiftyWithItsExactTotal() {
        var rows = IntStream.rangeClosed(1, 60).mapToObj(i -> row(i, 41L, "Deshierbo", 50L, null, "A")).toList();
        var items = WeeklyAssembler.items(WeeklyAssembler.works(rows));

        assertThat(items.total()).isEqualTo(60);
        assertThat(items.items()).hasSize(50);
    }

    @Test
    void neverIrrigatedSectionsComeFirstThenTheLongestWithoutWater() {
        var sections = List.of(section(1, "AV-01"), section(2, "AV-02"), section(3, "AV-03"), section(4, "AV-04"));
        var rows = WeeklyAssembler.notIrrigated(sections, Set.of(4L),
                Map.of(1L, LocalDate.of(2026, 10, 20), 3L, LocalDate.of(2026, 10, 12)));

        assertThat(rows.total()).isEqualTo(3);
        assertThat(rows.items()).extracting("code").containsExactly("AV-02", "AV-03", "AV-01");
    }

    @Test
    void descriptionsAreCutAt140CharactersWithAnEllipsis() {
        String longText = "a".repeat(200);
        assertThat(WeeklyAssembler.truncate(longText)).hasSize(140).endsWith("…");
        assertThat(WeeklyAssembler.truncate("corta")).isEqualTo("corta");
        assertThat(WeeklyAssembler.truncate(null)).isNull();
    }

    @Test
    void daysOpenIsTheCivilDifferenceToTheCutoff() {
        var row = new IncidentRow(12L, "Rama", "Pontódromo", "HIGH", "Alta", "IN_PROGRESS", "En atención",
                "Cuadrilla 2", LocalDate.of(2026, 10, 29), 2L, "COORDINATES");
        var incident = WeeklyAssembler.incident(row, LocalDate.of(2026, 11, 1));

        assertThat(incident.daysOpen()).isEqualTo(3);
        assertThat(incident.urgency().code()).isEqualTo("HIGH");
        assertThat(incident.status().label()).isEqualTo("En atención");
    }

    private static SectionRef section(long id, String code) {
        return new SectionRef(id, code, "Jardín " + code, BigDecimal.TEN, 9L, "SEC", "Sector");
    }
}
