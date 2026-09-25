package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LoginAttemptServiceTest {

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService(5, 15);
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
    void attemptsOutsideTheWindowDoNotCount() {
        LoginAttemptService instantWindow = new LoginAttemptService(5, 0);
        for (int i = 0; i < 10; i++) {
            instantWindow.recordFailure("ana@pucp.edu.pe");
        }

        // Con ventana de 0 minutos, todo intento previo ya quedó fuera.
        assertThat(instantWindow.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void normalizesTheEmailSoCaseDoesNotBypassTheBlock() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("Ana@PUCP.edu.pe");
        }

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isTrue();
    }

    @Test
    void readsTheThresholdFromTheSystemParameterOnEveryCheck() {
        SystemParameterReader reader = mock(SystemParameterReader.class);
        when(reader.readInt(SystemParameterCodes.LOGIN_MAX_ATTEMPTS, 5)).thenReturn(2);
        LoginAttemptService dynamic = new LoginAttemptService(reader, 5, 15);

        dynamic.recordFailure("ana@pucp.edu.pe");
        assertThat(dynamic.isBlocked("ana@pucp.edu.pe")).isFalse();

        dynamic.recordFailure("ana@pucp.edu.pe");
        assertThat(dynamic.isBlocked("ana@pucp.edu.pe")).isTrue();
    }
}
