package pe.edu.pucp.hesperides.modules.auth.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;

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
 * El umbral lo da {@code system_parameters.LOGIN_MAX_ATTEMPTS} y se relee en cada
 * comprobación, de modo que el cambio del administrador aplica al siguiente
 * intento sin reiniciar el backend. El constructor con enteros —usado por los
 * test de unidad— conserva los valores como defecto.
 *
 * El estado vive en memoria: son decenas de usuarios y una sola instancia de
 * backend. Si el despliegue creciera a varias réplicas habría que moverlo a
 * Redis — está aislado aquí para que ese cambio no toque AuthService.
 */
@Service
public class LoginAttemptService {

    private final SystemParameterReader parameters;
    private final int configuredMaxAttempts;
    private final long windowMinutes;
    private final Map<String, List<Instant>> failuresByEmail = new ConcurrentHashMap<>();

    public LoginAttemptService(int maxAttempts, long windowMinutes) {
        this(null, maxAttempts, windowMinutes);
    }

    @Autowired
    public LoginAttemptService(
            SystemParameterReader parameters,
            @Value("${hesperides.security.login.max-attempts:5}") int maxAttempts,
            @Value("${hesperides.security.login.window-minutes:15}") long windowMinutes) {
        this.parameters = parameters;
        this.configuredMaxAttempts = maxAttempts;
        this.windowMinutes = windowMinutes;
    }

    public boolean isBlocked(String email) {
        return recentFailures(normalize(email)).size() >= currentMaxAttempts();
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

    /** Sin lectura a la base en los test de unidad; el bean de Spring lo relee. */
    private int currentMaxAttempts() {
        return parameters == null ? configuredMaxAttempts
                : parameters.readInt(SystemParameterCodes.LOGIN_MAX_ATTEMPTS, configuredMaxAttempts);
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
