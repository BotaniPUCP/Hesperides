package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

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
}
