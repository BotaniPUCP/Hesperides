package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.service.AuditService;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock
    private AuditService auditService;

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService(5, 15, auditService);
    }

    @Test
    void aFreshEmailIsNotBlocked() {
        assertThat(service.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void blocksAfterReachingTheThreshold() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isTrue();
    }

    @Test
    void doesNotBlockBelowTheThreshold() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void blocksEachEmailIndependently() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        assertThat(service.isBlocked("otra@pucp.edu.pe")).isFalse();
    }

    @Test
    void aSuccessfulLoginClearsTheCounter() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        service.reset("ana@pucp.edu.pe");
        service.recordFailure("ana@pucp.edu.pe");

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void reachingTheThresholdAuditsTheLockoutWithoutAGivenActor() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        verify(auditService).record(
                eq(AuditActionCode.LOGIN_FAILED_LOCKOUT),
                eq("User"),
                nullable(Long.class),
                anyMap());

        // No hay sesión aún al bloquearse: la auditoría de un 4º intento no
        // se emite, solo la del umbral alcanzado.
        service.recordFailure("ana@pucp.edu.pe");
        verify(auditService, org.mockito.Mockito.times(1))
                .record(eq(AuditActionCode.LOGIN_FAILED_LOCKOUT), any(), nullable(Long.class), anyMap());
    }

    @Test
    void belowTheThresholdDoesNotAuditAnything() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        verify(auditService, never()).record(any(AuditActionCode.class), any(), nullable(Long.class), anyMap());
    }
}