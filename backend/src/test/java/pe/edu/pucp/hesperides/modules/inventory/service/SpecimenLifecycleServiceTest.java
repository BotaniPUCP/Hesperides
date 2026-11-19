package pe.edu.pucp.hesperides.modules.inventory.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.event.SpecimenDeactivatedEvent;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpecimenLifecycleServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private AuditService audit;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private SpecimenLifecycleService service;

    @BeforeEach
    void setUp() {
        service = new SpecimenLifecycleService(jdbc, audit, eventPublisher);
    }

    @Test
    @SuppressWarnings("unchecked")
    void deactivatePublishesSpecimenDeactivatedEventAndAudits() {
        String code = "AR-000001";
        String reason = "Riesgo de caída por raíces dañadas";
        Timestamp now = Timestamp.from(Instant.now());

        // Simula búsqueda de ejemplar activo
        when(jdbc.query(anyString(), any(RowMapper.class), eq(code)))
                .thenAnswer(invocation -> {
                    RowMapper<?> mapper = invocation.getArgument(1);
                    java.sql.ResultSet rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
                    when(rs.getLong("id")).thenReturn(42L);
                    when(rs.getString("code")).thenReturn(code);
                    when(rs.getObject("species_id", Long.class)).thenReturn(10L);
                    return List.of(mapper.mapRow(rs, 0));
                });

        // Simula bloqueo de especie (permanece activa con otros ejemplares)
        when(jdbc.query(anyString(), any(RowMapper.class), eq(10L)))
                .thenAnswer(invocation -> {
                    RowMapper<?> mapper = invocation.getArgument(1);
                    java.sql.ResultSet rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
                    when(rs.getString("slug")).thenReturn("ficus-elastica");
                    when(rs.getBoolean("is_active")).thenReturn(true);
                    return List.of(mapper.mapRow(rs, 0));
                });

        // Simula UPDATE green_elements RETURNING deleted_at
        when(jdbc.queryForObject(anyString(), any(RowMapper.class), eq(42L)))
                .thenReturn(now);

        service.deactivate(code, reason);

        // Verifica auditoría
        verify(audit).record(eq(AuditActionCode.GREEN_ELEMENT_SOFT_DELETED), eq("GreenElement"), eq(42L), any());

        // Verifica publicación del evento desacoplado
        ArgumentCaptor<SpecimenDeactivatedEvent> eventCaptor = ArgumentCaptor.forClass(SpecimenDeactivatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());

        SpecimenDeactivatedEvent captured = eventCaptor.getValue();
        assertThat(captured.specimenId()).isEqualTo(42L);
        assertThat(captured.specimenCode()).isEqualTo(code);
        assertThat(captured.speciesId()).isEqualTo(10L);
        assertThat(captured.reason()).isEqualTo(reason);
        assertThat(captured.deactivatedAt()).isEqualTo(now.toInstant());
    }

    @Test
    @SuppressWarnings("unchecked")
    void deactivateThrowsConflictIfAlreadyInactive() {
        String code = "AR-999999";
        when(jdbc.query(anyString(), any(RowMapper.class), eq(code)))
                .thenReturn(Collections.emptyList());
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(code)))
                .thenReturn(true);

        assertThatThrownBy(() -> service.deactivate(code, "Cualquiera"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ya está inactivo");
    }

    @Test
    @SuppressWarnings("unchecked")
    void deactivateThrowsNotFoundIfMissing() {
        String code = "AR-000000";
        when(jdbc.query(anyString(), any(RowMapper.class), eq(code)))
                .thenReturn(Collections.emptyList());
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(code)))
                .thenReturn(false);

        assertThatThrownBy(() -> service.deactivate(code, "Cualquiera"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Specimen not found");
    }

    @Test
    @SuppressWarnings("unchecked")
    void deactivateBatchProcessesMultipleSpecimensInSortedOrder() {
        String code1 = "AR-000002";
        String code2 = "AR-000001";
        String reason = "Retiro por obra civil";
        Timestamp now = Timestamp.from(Instant.now());

        when(jdbc.query(anyString(), any(RowMapper.class), eq(code1)))
                .thenAnswer(invocation -> {
                    RowMapper<?> mapper = invocation.getArgument(1);
                    java.sql.ResultSet rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
                    when(rs.getLong("id")).thenReturn(43L);
                    when(rs.getString("code")).thenReturn(code1);
                    when(rs.getObject("species_id", Long.class)).thenReturn(10L);
                    return List.of(mapper.mapRow(rs, 0));
                });

        when(jdbc.query(anyString(), any(RowMapper.class), eq(code2)))
                .thenAnswer(invocation -> {
                    RowMapper<?> mapper = invocation.getArgument(1);
                    java.sql.ResultSet rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
                    when(rs.getLong("id")).thenReturn(42L);
                    when(rs.getString("code")).thenReturn(code2);
                    when(rs.getObject("species_id", Long.class)).thenReturn(10L);
                    return List.of(mapper.mapRow(rs, 0));
                });

        when(jdbc.query(anyString(), any(RowMapper.class), eq(10L)))
                .thenAnswer(invocation -> {
                    RowMapper<?> mapper = invocation.getArgument(1);
                    java.sql.ResultSet rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
                    when(rs.getString("slug")).thenReturn("ficus-elastica");
                    when(rs.getBoolean("is_active")).thenReturn(true);
                    return List.of(mapper.mapRow(rs, 0));
                });

        when(jdbc.queryForObject(anyString(), any(RowMapper.class), eq(42L))).thenReturn(now);
        when(jdbc.queryForObject(anyString(), any(RowMapper.class), eq(43L))).thenReturn(now);

        List<String> result = service.deactivateBatch(List.of(code1, code2), reason);

        assertThat(result).containsExactly("AR-000001", "AR-000002");
        verify(audit).record(eq(AuditActionCode.GREEN_ELEMENT_SOFT_DELETED), eq("GreenElement"), eq(42L), any());
        verify(audit).record(eq(AuditActionCode.GREEN_ELEMENT_SOFT_DELETED), eq("GreenElement"), eq(43L), any());
    }

    @Test
    void deactivateBatchReturnsEmptyOnNullOrEmpty() {
        assertThat(service.deactivateBatch(null, "Motivo")).isEmpty();
        assertThat(service.deactivateBatch(List.of(), "Motivo")).isEmpty();
    }
}
