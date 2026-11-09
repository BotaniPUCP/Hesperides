package pe.edu.pucp.hesperides.modules.planning.sets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetRequest;
import pe.edu.pucp.hesperides.modules.planning.sets.entity.GreenAreaSet;
import pe.edu.pucp.hesperides.modules.planning.sets.repository.GreenAreaSetQueries;
import pe.edu.pucp.hesperides.modules.planning.sets.repository.GreenAreaSetQueries.OwnRuleOverlap;
import pe.edu.pucp.hesperides.modules.planning.sets.repository.GreenAreaSetsRepository;
import pe.edu.pucp.hesperides.modules.planning.sets.service.GreenAreaSetsServiceImpl;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** SPEC-203 §3.1 y §8 «Conjuntos». */
class GreenAreaSetsServiceImplTest {

    private static final String EMAIL = "coordinador@pucp.edu.pe";

    private GreenAreaSetsRepository sets;
    private GreenAreaSetQueries queries;
    private AuditService audit;
    private GreenAreaSetsServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        sets = mock(GreenAreaSetsRepository.class);
        queries = mock(GreenAreaSetQueries.class);
        audit = mock(AuditService.class);
        var users = mock(UsersRepository.class);
        var user = new User();
        setId(user, 3L);
        user.setActive(true);
        when(users.findActiveByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(sets.save(any(GreenAreaSet.class))).thenAnswer(inv -> {
            GreenAreaSet s = inv.getArgument(0);
            if (s.getId() == null) setId(s, 40L);
            return s;
        });
        when(queries.nonSections(anyCollection())).thenReturn(List.of());
        when(queries.invalidActivities(anyCollection())).thenReturn(List.of());
        when(queries.zonesOf(anyLong())).thenReturn(List.of());
        when(queries.activitiesOf(anyLong())).thenReturn(List.of());
        when(queries.overlaps(anyLong())).thenReturn(List.of());
        service = new GreenAreaSetsServiceImpl(sets, queries, users, audit);
    }

    private static void setId(BaseEntity entity, Long id) throws Exception {
        Field f = BaseEntity.class.getDeclaredField("id");
        f.setAccessible(true);
        f.set(entity, id);
    }

    private static GreenAreaSetRequest request(String name, List<Long> zones, List<Long> activities, Long version) {
        return new GreenAreaSetRequest(name, null, zones, activities, version);
    }

    private GreenAreaSet existing(long id, String name, long version) throws Exception {
        var set = new GreenAreaSet();
        setId(set, id);
        set.setName(name);
        set.setVersion(version);
        when(sets.findActiveById(id)).thenReturn(Optional.of(set));
        return set;
    }

    @Test
    void theNameIsTrimmedAndTheZonesDeduplicated() {
        service.create(request("  Pabellones ", List.of(112L, 112L, 113L), List.of(30L), null), EMAIL);

        verify(sets).save(argThat(s -> s.getName().equals("Pabellones") && s.getCreatedByUserId() == 3L));
        verify(queries).replaceZones(40L, List.of(112L, 113L));
        verify(queries).replaceActivities(40L, List.of(30L));
    }

    @Test
    void aNameTakenByAnActiveSetIsRejectedIgnoringCase() {
        when(sets.existsActiveNameIgnoringCase("pabellones", null)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request("pabellones", List.of(1L), List.of(30L), null), EMAIL))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Ya existe un conjunto con ese nombre");
    }

    @Test
    void aBlankNameIsRejected() {
        assertThatThrownBy(() -> service.create(request("   ", List.of(1L), List.of(30L), null), EMAIL))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("El nombre del conjunto es obligatorio");
    }

    @Test
    void aSetNeedsAtLeastOneGardenAndOneActivity() {
        assertThatThrownBy(() -> service.create(request("A", List.of(), List.of(30L), null), EMAIL))
                .hasMessage("Elige al menos un jardín");
        assertThatThrownBy(() -> service.create(request("A", List.of(1L), List.of(), null), EMAIL))
                .hasMessage("Elige al menos una actividad");
    }

    @Test
    void onlySectionsCanBeAdded() {
        when(queries.nonSections(anyCollection())).thenReturn(List.of(7L, 9L));

        assertThatThrownBy(() -> service.create(request("A", List.of(7L, 9L, 12L), List.of(30L), null), EMAIL))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Solo se pueden agregar secciones: 7, 9");
        verify(sets, never()).save(any());
    }

    @Test
    void unknownActivitiesAreRejected() {
        when(queries.invalidActivities(anyCollection())).thenReturn(List.of(99L));

        assertThatThrownBy(() -> service.create(request("A", List.of(1L), List.of(99L), null), EMAIL))
                .hasMessage("Actividades no válidas: 99");
    }

    @Test
    void updatingWithAnOldVersionConflicts() throws Exception {
        existing(40L, "Pabellones", 3L);

        assertThatThrownBy(() -> service.update(40L, request("Pabellones", List.of(1L), List.of(30L), 2L), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Otra persona cambió este conjunto. Recarga para ver su versión.");
    }

    @Test
    void updatingAdvancesTheVersion() throws Exception {
        var set = existing(40L, "Pabellones", 3L);

        service.update(40L, request("Pabellones", List.of(1L), List.of(30L), 3L), EMAIL);

        assertThat(set.getVersion()).isEqualTo(4L);
        verify(audit).record(eq(AuditActionCode.GREEN_AREA_SET_UPDATED), eq("GREEN_AREA_SET"), eq(40L),
                eq(Map.of("zoneCount", 1)));
    }

    @Test
    void aSetWithItsOwnCurrentRuleCannotBeDeleted() throws Exception {
        existing(40L, "Pabellones", 3L);
        when(queries.hasCurrentOwnRule(40L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(40L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Quita primero la frecuencia propia de este conjunto");
    }

    @Test
    void deletingIsLogicalAndAudited() throws Exception {
        var set = existing(40L, "Pabellones", 3L);

        service.delete(40L);

        assertThat(set.isDeleted()).isTrue();
        verify(audit).record(eq(AuditActionCode.GREEN_AREA_SET_DELETED), eq("GREEN_AREA_SET"), eq(40L), any());
    }

    @Test
    void crossingOwnRulesProduceAWarning() throws Exception {
        existing(40L, "Ruta de ingreso", 0L);
        when(queries.overlaps(40L)).thenReturn(List.of(new OwnRuleOverlap("Sección 113", "Corte de césped", "Pabellones")));

        var detail = service.update(40L, request("Ruta de ingreso", List.of(113L), List.of(30L), 0L), EMAIL);

        assertThat(detail.warnings()).containsExactly(
                "La sección Sección 113 ya sigue otra frecuencia propia de Corte de césped en «Pabellones»; se usará la más frecuente");
    }

    @Test
    void creatingIsAuditedWithTheGardenCount() {
        service.create(request("Pabellones", List.of(1L, 2L), List.of(30L), null), EMAIL);

        verify(audit).record(AuditActionCode.GREEN_AREA_SET_CREATED, "GREEN_AREA_SET", 40L, Map.of("zoneCount", 2));
    }
}
