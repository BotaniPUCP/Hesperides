package pe.edu.pucp.hesperides.modules.planning;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.planning.PlanningState;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries;
import pe.edu.pucp.hesperides.modules.planning.repository.PlanningSetsQueries.SetSnapshot;
import pe.edu.pucp.hesperides.modules.planning.service.PlanningRule;
import pe.edu.pucp.hesperides.modules.planning.service.PlanningRuleSource;
import pe.edu.pucp.hesperides.modules.planning.service.PlanningServiceImpl;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** SPEC-203 §5.5 «Qué filas existen» y §5.6 «Atendido hace poco». */
class PlanningServiceImplTest {

    private static final LocalDate HOY = LocalDate.of(2026, 11, 8);
    private static final long CORTE = 30;
    private static final long PODA = 31;

    private PlanningSetsQueries sets;
    private PlanningRuleSource rules;
    private GardenAttendanceProvider attendance;
    private PlanningServiceImpl service;
    private final List<GardenCompletion> completions = new ArrayList<>();

    @BeforeEach
    void setUp() {
        sets = mock(PlanningSetsQueries.class);
        rules = mock(PlanningRuleSource.class);
        attendance = mock(GardenAttendanceProvider.class);
        when(attendance.completions(anyLong(), anyCollection())).thenAnswer(inv -> completions);
        when(attendance.openWorks(anyLong(), anyCollection())).thenReturn(List.of());
        when(sets.displayNames(anyCollection())).thenReturn(Map.of(1L, "Jardín 1", 2L, "Jardín 2"));
        var clock = Clock.fixed(HOY.atStartOfDay(ZoneId.of("America/Lima")).toInstant(), ZoneId.of("America/Lima"));
        service = new PlanningServiceImpl(sets, rules, attendance, clock, "America/Lima");
    }

    private static FrequencyRule intervalo(long id, int min, int max) {
        return new FrequencyRule(id, "INTERVAL_DAYS", min, max, null, null, null, null, List.of(), LocalDate.of(2020, 1, 1), null);
    }

    private static PlanningRule general(long activity, FrequencyRule rule) {
        return new PlanningRule(activity, "Actividad " + activity, null, rule);
    }

    private static PlanningRule propia(long activity, long set, FrequencyRule rule) {
        return new PlanningRule(activity, "Actividad " + activity, set, rule);
    }

    private void completado(long zone, LocalDate day) {
        completions.add(new GardenCompletion(zone, completions.size() + 1, day));
    }

    @Test
    void aDeclaredActivityWithTheGeneralRuleGivesARowJudgedByTheOldestGarden() {
        when(sets.activeSets()).thenReturn(List.of(new SetSnapshot(5, "Pabellones", Set.of(1L, 2L), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.minusDays(36));
        completado(2, HOY.minusDays(10));

        var rows = service.rows();

        assertThat(rows).singleElement().satisfies(r -> {
            assertThat(r.setName()).isEqualTo("Pabellones");
            assertThat(r.zoneCount()).isEqualTo(2);
            assertThat(r.state()).isEqualTo(PlanningState.OVERDUE);
            assertThat(r.days()).isEqualTo(1);
            assertThat(r.ownRule()).isFalse();
        });
    }

    @Test
    void theSetsOwnRuleWinsOverTheGeneralOne() {
        when(sets.activeSets()).thenReturn(List.of(new SetSnapshot(5, "Campo", Set.of(1L), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35)), propia(CORTE, 5, intervalo(2, 20, 25))));
        completado(1, HOY.minusDays(22));

        var row = service.rows().get(0);

        assertThat(row.ownRule()).isTrue();
        assertThat(row.rhythm().minDays()).isEqualTo(20);
        assertThat(row.state()).isEqualTo(PlanningState.DUE);
    }

    @Test
    void anUndeclaredActivityGivesNoRowAndADeclaredOneWithoutRuleIsNotConfigured() {
        when(sets.activeSets()).thenReturn(List.of(new SetSnapshot(5, "Pabellones", Set.of(1L), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(general(PODA, intervalo(1, 30, 35))));

        assertThat(service.rows()).singleElement().satisfies(r -> {
            assertThat(r.activityTypeItemId()).isEqualTo(CORTE);
            assertThat(r.state()).isEqualTo(PlanningState.NOT_CONFIGURED);
        });
    }

    @Test
    void aSetWithoutActiveGardensGivesNoRow() {
        when(sets.activeSets()).thenReturn(List.of(new SetSnapshot(5, "Vacío", Set.of(), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));

        assertThat(service.rows()).isEmpty();
    }

    @Test
    void rowsComeSortedByUrgency() {
        when(sets.activeSets()).thenReturn(List.of(
                new SetSnapshot(5, "Al día", Set.of(1L), Set.of(CORTE)),
                new SetSnapshot(6, "Atrasado", Set.of(2L), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.minusDays(5));
        completado(2, HOY.minusDays(50));

        assertThat(service.rows()).extracting(r -> r.setName()).containsExactly("Atrasado", "Al día");
    }

    @Test
    void anOpenWorkTravelsWithItsFirstStart() {
        when(sets.activeSets()).thenReturn(List.of(new SetSnapshot(5, "Tambo", Set.of(1L, 2L), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        when(attendance.openWorks(anyLong(), anyCollection())).thenReturn(List.of(new pe.edu.pucp.hesperides.modules.planning
                .attendance.OpenWork(81, "INT-000081", HOY.minusDays(4), HOY.minusDays(3), Set.of(1L, 2L))));

        var row = service.rows().get(0);

        assertThat(row.state()).isEqualTo(PlanningState.IN_PROGRESS);
        assertThat(row.openIntervention().startedDate()).isEqualTo(HOY.minusDays(3));
        assertThat(row.openIntervention().code()).isEqualTo("INT-000081");
    }

    @Test
    void recentAttentionUsesTheMostFrequentOwnRule() {
        when(sets.activeSets()).thenReturn(List.of(
                new SetSnapshot(5, "A", Set.of(1L), Set.of(CORTE)), new SetSnapshot(6, "B", Set.of(1L), Set.of(CORTE))));
        when(rules.current()).thenReturn(List.of(propia(CORTE, 5, intervalo(1, 30, 35)), propia(CORTE, 6, intervalo(2, 20, 25))));
        completado(1, HOY.minusDays(3));

        assertThat(service.recentAttention(CORTE, HOY, List.of(1L))).singleElement().satisfies(r -> {
            assertThat(r.minDays()).isEqualTo(20);
            assertThat(r.daysSinceLast()).isEqualTo(3);
            assertThat(r.displayName()).isEqualTo("Jardín 1");
        });
    }

    @Test
    void recentAttentionOfAGardenInNoSetUsesTheGeneralRule() {
        when(sets.activeSets()).thenReturn(List.of());
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(2, HOY.minusDays(3));

        assertThat(service.recentAttention(CORTE, HOY, List.of(2L))).singleElement()
                .satisfies(r -> assertThat(r.minDays()).isEqualTo(30));
    }

    @Test
    void aQuotaNeverWarnsOfRecentAttention() {
        when(sets.activeSets()).thenReturn(List.of());
        when(rules.current()).thenReturn(List.of(general(CORTE, new FrequencyRule(1L, "SEASONAL_PERIOD", null, null, 4,
                null, null, null, List.of(), LocalDate.of(2020, 1, 1), null))));
        completado(1, HOY.minusDays(1));

        assertThat(service.recentAttention(CORTE, HOY, List.of(1L))).isEmpty();
    }
}
