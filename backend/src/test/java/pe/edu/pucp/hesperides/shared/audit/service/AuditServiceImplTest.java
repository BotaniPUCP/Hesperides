package pe.edu.pucp.hesperides.shared.audit.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.entity.AuditLog;
import pe.edu.pucp.hesperides.shared.audit.repository.AuditLogRepository;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditServiceImplTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UsersRepository usersRepository;

    private AuditServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuditServiceImpl(auditLogRepository, usersRepository);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolvesTheAuthenticatedActorAsUser() {
        User admin = new User();
        withId(admin, 7L);
        admin.setEmail("admin@pucp.edu.pe");
        when(usersRepository.findByEmail("admin@pucp.edu.pe")).thenReturn(Optional.of(admin));
        authenticate(admin.getEmail());

        service.record(AuditActionCode.USER_DEACTIVATED, "User", 12L,
                Map.of("isActive", Map.of("before", true, "after", false)));

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(saved.capture());
        assertThat(saved.getValue().getAction()).isEqualTo(AuditActionCode.USER_DEACTIVATED);
        assertThat(saved.getValue().getEntityType()).isEqualTo("User");
        assertThat(saved.getValue().getEntityId()).isEqualTo(12L);
        assertThat(saved.getValue().getUserId()).isEqualTo(7L);

        Map<?, ?> isActive = (Map<?, ?>) saved.getValue().getChanges().get("isActive");
        assertThat(isActive.get("before")).isEqualTo(true);
        assertThat(isActive.get("after")).isEqualTo(false);
    }

    @Test
    void persistsUserNullWhenThereIsNoAuthenticatedActor() {
        SecurityContextHolder.clearContext();

        service.record(AuditActionCode.LOGIN_FAILED_LOCKOUT, "User", null,
                Map.of("email", "ana@pucp.edu.pe", "attempts", 5, "windowMinutes", 15));

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isNull();
        assertThat(saved.getValue().getEntityId()).isNull();
        assertThat(saved.getValue().getIpAddress()).isNull();
        assertThat(saved.getValue().getChanges().get("attempts")).isEqualTo(5);
    }

    @Test
    void aDeletedActorStillResolvesToItsUserId() {
        User formerAdmin = new User();
        withId(formerAdmin, 9L);
        formerAdmin.setEmail("ex-admin@pucp.edu.pe");
        when(usersRepository.findByEmail("ex-admin@pucp.edu.pe")).thenReturn(Optional.of(formerAdmin));
        authenticate(formerAdmin.getEmail());

        service.record(AuditActionCode.USER_REACTIVATED, "User", 3L, null);

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(9L);
        assertThat(saved.getValue().getChanges()).isNull();
    }

    private void authenticate(String email) {
        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(email)
                .password("x")
                .authorities("ROLE_FALLBACK")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    private void withId(Object entity, Long id) {
        try {
            java.lang.reflect.Field field =
                    pe.edu.pucp.hesperides.shared.entity.BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("No se pudo fijar el id en el test", ex);
        }
    }
}