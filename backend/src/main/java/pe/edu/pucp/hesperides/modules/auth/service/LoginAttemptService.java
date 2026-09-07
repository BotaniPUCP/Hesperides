package pe.edu.pucp.hesperides.modules.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita los intentos fallidos de login por correo (SPEC-001 §9.3).
 *
 * El estado vive en memoria: son decenas de usuarios y una sola instancia de
 * backend. Si el despliegue creciera a varias réplicas habría que moverlo a
 * Redis — está aislado aquí para que ese cambio no toque AuthService.
 */
@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final long windowMinutes;
    private final Map<String, List<Instant>> failuresByEmail = new ConcurrentHashMap<>();

    public LoginAttemptService(
            @Value("${hesperides.security.login.max-attempts:5}") int maxAttempts,
            @Value("${hesperides.security.login.window-minutes:15}") long windowMinutes) {
        this.maxAttempts = maxAttempts;
        this.windowMinutes = windowMinutes;
    }

    public boolean isBlocked(String email) {
        return recentFailures(normalize(email)).size() >= maxAttempts;
    }

    public void recordFailure(String email) {
        String key = normalize(email);
        failuresByEmail.compute(key, (ignored, previous) -> {
            List<Instant> updated = previous == null ? new ArrayList<>() : new ArrayList<>(previous);
            updated.add(Instant.now());
            return updated;
        });
    }

    public void reset(String email) {
        failuresByEmail.remove(normalize(email));
    }

    private List<Instant> recentFailures(String key) {
        List<Instant> all = failuresByEmail.get(key);
        if (all == null) {
            return List.of();
        }
        Instant cutoff = Instant.now().minus(windowMinutes, ChronoUnit.MINUTES);
        return all.stream().filter(attempt -> attempt.isAfter(cutoff)).toList();
    }

    /** Sin normalizar, alternar mayúsculas bastaría para esquivar el bloqueo. */
    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
