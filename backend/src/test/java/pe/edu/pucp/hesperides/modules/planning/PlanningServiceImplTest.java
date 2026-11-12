package pe.edu.pucp.hesperides.modules.planning;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.planning.PlanningState;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenSpecimenWork;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenCompletion;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries;
import pe.edu.pucp.hesperides.modules.planning.assignments.repository.PlanningAssignmentsQueries.Assignment;
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
import java.util.UUID;

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
    private PlanningAssignmentsQueries assignments;
    private final List<Assignment> assigned = new ArrayList<>();
    private PlanningRuleSource rules;
    private GardenAttendanceProvider attendance;
    private SpecimenAttendanceProvider specimens;
    private PlanningServiceImpl service;
    private final List<GardenCompletion> completions = new ArrayList<>();
    private final List<SpecimenCompletion> specimenCompletions = new ArrayList<>();

    @BeforeEach
    void setUp() {
        sets = mock(PlanningSetsQueries.class);
        assignments = mock(PlanningAssignmentsQueries.class);
        when(assignments.active()).thenAnswer(inv -> assigned);
        rules = mock(PlanningRuleSource.class);
        attendance = mock(GardenAttendanceProvider.class);
        when(attendance.completions(anyLong(), anyCollection())).thenAnswer(inv -> completions);
        when(attendance.openWorks(anyLong(), anyCollection())).thenReturn(List.of());
        specimens = mock(SpecimenAttendanceProvider.class);
        when(specimens.specimenCompletions(anyLong(), anyCollection())).thenAnswer(inv -> specimenCompletions);
        when(specimens.openSpecimenWorks(anyLong(), anyCollection())).thenReturn(List.of());
        when(sets.displayNames(anyCollection())).thenReturn(Map.of(1L, "Jardín 1", 2L, "Jardín 2"));
        var clock = Clock.fixed(HOY.atStartOfDay(ZoneId.of("America/Lima")).toInstant(), ZoneId.of("America/Lima"));
        service = new PlanningServiceImpl(sets, assignments, rules, attendance, specimens, clock, "America/Lima");
    }

    private static FrequencyRule intervalo(long id, int min, int max) {
        return new FrequencyRule(id, "INTERVAL_DAYS", min, max, null, null, null, null, List.of(), LocalDate.of(2020, 1, 1), null);
    }

    private static UUID generalKey(long activity) {
        return new UUID(0, activity);
    }

    private static UUID propiaKey(long set) {
        return new UUID(1, set);
    }

    private static PlanningRule general(long activity, FrequencyRule rule) {
        return new PlanningRule(activity, "Actividad " + activity, generalKey(activity), true, rule);
    }

    /** Una regla para conjuntos; {@code set} solo distingue su clave en la prueba. */
    private static PlanningRule propia(long activity, long set, FrequencyRule rule) {
        return new PlanningRule(activity, "Actividad " + activity, propiaKey(set), false, rule);
    }

    /** Un conjunto con Corte de césped asignado a la regla de todo el campus (SPEC-203 §3.4). */
    private SetSnapshot conjunto(long id, String name, Set<Long> zones, Set<Long> elements) {
        assigned.removeIf(a -> a.setId() == id);
        assigned.add(new Assignment(100 + id, id, name, CORTE, "Actividad " + CORTE, generalKey(CORTE)));
        return new SetSnapshot(id, name, zones, elements);
    }

    private void asignar(long set, UUID rule) {
        Assignment old = assigned.stream().filter(a -> a.setId() == set).findFirst().orElseThrow();
        assigned.replaceAll(a -> a == old ? new Assignment(a.id(), a.setId(), a.setName(), a.activityId(), a.activityLabel(), rule) : a);
    }

    private void completado(long zone, LocalDate day) {
        completions.add(new GardenCompletion(zone, completions.size() + 1, day));
    }

    @Test
    void anAssignmentToTheGeneralRuleGivesARowJudgedByTheOldestGarden() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Pabellones", Set.of(1L, 2L), Set.of())));
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
            assertThat(r.assignmentId()).isEqualTo(105L);
            assertThat(r.ruleKey()).isEqualTo(generalKey(CORTE));
        });
    }

    @Test
    void aSetAssignedARuleForSetsIsJudgedByIt() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Campo", Set.of(1L), Set.of())));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35)), propia(CORTE, 5, intervalo(2, 20, 25))));
        asignar(5, propiaKey(5));
        completado(1, HOY.minusDays(22));

        var row = service.rows().get(0);

        assertThat(row.ownRule()).isTrue();
        assertThat(row.rhythm().minDays()).isEqualTo(20);
        assertThat(row.state()).isEqualTo(PlanningState.DUE);
    }

    @Test
    void anUnassignedActivityGivesNoRowAndAnAssignmentWhoseRuleNoLongerPlansIsNotConfigured() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Pabellones", Set.of(1L), Set.of())));
        when(rules.current()).thenReturn(List.of(general(PODA, intervalo(1, 30, 35))));

        assertThat(service.rows()).singleElement().satisfies(r -> {
            assertThat(r.activityTypeItemId()).isEqualTo(CORTE);
            assertThat(r.state()).isEqualTo(PlanningState.NOT_CONFIGURED);
        });
    }

    @Test
    void aSetWithoutAssignmentsGivesNoRow() {
        when(sets.activeSets()).thenReturn(List.of(new SetSnapshot(5, "Sin asignar", Set.of(1L), Set.of())));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));

        assertThat(service.rows()).isEmpty();
    }

    @Test
    void aSetWithoutActiveGardensGivesNoRow() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Vacío", Set.of(), Set.of())));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));

        assertThat(service.rows()).isEmpty();
    }

    @Test
    void aSpecimenCountsOnItsOwnEvenInsideAnAttendedGarden() {
        // D-14: el jardín 1 se atendió ayer, pero el ejemplar 700 nunca fue nombrado en una intervención.
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Mixto", Set.of(1L), Set.of(700L))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.minusDays(1));

        assertThat(service.rows()).singleElement().satisfies(r -> {
            assertThat(r.zoneCount()).isEqualTo(1);
            assertThat(r.elementCount()).isEqualTo(1);
            assertThat(r.state()).isEqualTo(PlanningState.DUE);
            assertThat(r.neverAttendedCount()).isEqualTo(1);
        });
    }

    @Test
    void aSetOfOnlySpecimensIsJudgedByTheOneAttendedLongestAgo() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Palmeras", Set.of(), Set.of(700L, 701L))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        specimenCompletions.add(new SpecimenCompletion(700, 1, HOY.minusDays(40)));
        specimenCompletions.add(new SpecimenCompletion(701, 2, HOY.minusDays(5)));

        assertThat(service.rows()).singleElement().satisfies(r -> {
            assertThat(r.state()).isEqualTo(PlanningState.OVERDUE);
            assertThat(r.days()).isEqualTo(5);
            assertThat(r.lastDate()).isEqualTo(HOY.minusDays(40));
        });
    }

    @Test
    void aSpecimenWithTheSameIdAsAGardenIsADifferentUnit() {
        // El ejemplar 1 y la sección 1 no se pisan: solo se atendió el jardín.
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Choque", Set.of(1L), Set.of(1L))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.minusDays(2));

        assertThat(service.rows().get(0).neverAttendedCount()).isEqualTo(1);
    }

    @Test
    void oneInterventionWithGardensAndSpecimensIsASingleOpenRound() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Mixto", Set.of(1L), Set.of(700L))));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.minusDays(1));
        when(attendance.openWorks(anyLong(), anyCollection())).thenReturn(List.of(new pe.edu.pucp.hesperides.modules.planning
                .attendance.OpenWork(81, "INT-000081", HOY.minusDays(4), HOY.minusDays(2), Set.of(1L), Set.of())));
        when(specimens.openSpecimenWorks(anyLong(), anyCollection())).thenReturn(List.of(
                new OpenSpecimenWork(81, "INT-000081", HOY.minusDays(4), null, Set.of(700L), Set.of(700L))));

        var row = service.rows().get(0);

        assertThat(row.state()).isEqualTo(PlanningState.IN_PROGRESS);
        assertThat(row.progress().done()).isEqualTo(1);
        assertThat(row.progress().total()).isEqualTo(2);
        assertThat(row.openIntervention().startedDate()).isEqualTo(HOY.minusDays(2));
    }

    @Test
    void rowsComeSortedByUrgency() {
        when(sets.activeSets()).thenReturn(List.of(
                conjunto(5, "Al día", Set.of(1L), Set.of()),
                conjunto(6, "Atrasado", Set.of(2L), Set.of())));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.minusDays(5));
        completado(2, HOY.minusDays(50));

        assertThat(service.rows()).extracting(r -> r.setName()).containsExactly("Atrasado", "Al día");
    }

    @Test
    void anOpenWorkTravelsWithItsFirstStart() {
        when(sets.activeSets()).thenReturn(List.of(conjunto(5, "Tambo", Set.of(1L, 2L), Set.of())));
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        when(attendance.openWorks(anyLong(), anyCollection())).thenReturn(List.of(new pe.edu.pucp.hesperides.modules.planning
                .attendance.OpenWork(81, "INT-000081", HOY.minusDays(4), HOY.minusDays(3), Set.of(1L, 2L), Set.of(2L))));

        var row = service.rows().get(0);

        assertThat(row.state()).isEqualTo(PlanningState.IN_PROGRESS);
        assertThat(row.openIntervention().startedDate()).isEqualTo(HOY.minusDays(3));
        assertThat(row.openIntervention().code()).isEqualTo("INT-000081");
    }

    @Test
    void recentAttentionUsesTheMostFrequentOwnRule() {
        when(sets.activeSets()).thenReturn(List.of(
                conjunto(5, "A", Set.of(1L), Set.of()), conjunto(6, "B", Set.of(1L), Set.of())));
        when(rules.current()).thenReturn(List.of(propia(CORTE, 5, intervalo(1, 30, 35)), propia(CORTE, 6, intervalo(2, 20, 25))));
        asignar(5, propiaKey(5));
        asignar(6, propiaKey(6));
        completado(1, HOY.minusDays(3));

        assertThat(service.recentAttention(CORTE, HOY, List.of(1L))).singleElement().satisfies(r -> {
            assertThat(r.minDays()).isEqualTo(20);
            assertThat(r.daysSinceLast()).isEqualTo(3);
            assertThat(r.displayName()).isEqualTo("Jardín 1");
        });
    }

    @Test
    void recentAttentionIgnoresWhatWasDoneAfterTheScheduledDate() {
        when(sets.activeSets()).thenReturn(List.of());
        when(rules.current()).thenReturn(List.of(general(CORTE, intervalo(1, 30, 35))));
        completado(1, HOY.plusDays(2));

        assertThat(service.recentAttention(CORTE, HOY, List.of(1L))).isEmpty();
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
