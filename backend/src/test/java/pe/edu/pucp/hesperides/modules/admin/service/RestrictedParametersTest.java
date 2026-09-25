package pe.edu.pucp.hesperides.modules.admin.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class RestrictedParametersTest {

    private final RestrictedParameters restricted = new RestrictedParameters(
            "soporte@pucp.edu.pe", "smtp-relay.brevo.com", "https://hesperides.pucp.edu.pe",
            15, 1800, 7);

    private Map<String, String> valuesByCode() {
        return restricted.all().stream()
                .collect(Collectors.toMap(SystemParameterResponse::code, SystemParameterResponse::value));
    }

    @Test
    void exposesTheDeploymentValuesAsTheyAreApplied() {
        Map<String, String> values = valuesByCode();

        assertThat(values).containsEntry("SMTP_FROM", "soporte@pucp.edu.pe")
                .containsEntry("SMTP_HOST", "smtp-relay.brevo.com")
                .containsEntry("APP_PUBLIC_URL", "https://hesperides.pucp.edu.pe");
    }

    @Test
    void exposesThePasswordLimitsFromTheConstantsThatEnforceThem() {
        Map<String, String> values = valuesByCode();

        assertThat(values).containsEntry("PASSWORD_MAX_LENGTH", "72")
                .containsEntry("PASSWORD_MIN_LENGTH_RANGE", "12 – 25");
    }

    @Test
    void expressesTheSessionTimesInTheUnitsTheLabelsAnnounce() {
        Map<String, String> values = valuesByCode();

        // 1800 segundos de access token se leen como 30 minutos, no como 1800.
        assertThat(values).containsEntry("LOGIN_LOCK_WINDOW_MINUTES", "15")
                .containsEntry("SESSION_DURATION_MINUTES", "30")
                .containsEntry("SESSION_MAX_RENEWAL_DAYS", "7");
    }

    @Test
    void everyEntryIsLockedAndFullyDescribed() {
        List<SystemParameterResponse> all = restricted.all();

        assertThat(all).hasSize(8).allSatisfy(parameter -> {
            assertThat(parameter.isEditable()).isFalse();
            assertThat(parameter.label()).isNotBlank();
            assertThat(parameter.description()).isNotBlank();
        });
    }

    @Test
    void neverExposesCredentials() {
        assertThat(restricted.all()).extracting(SystemParameterResponse::code)
                .doesNotContain("SMTP_USERNAME", "SMTP_PASSWORD", "JWT_SECRET", "POSTGRES_PASSWORD");
    }

    @Test
    void recognisesOnlyItsOwnCodes() {
        assertThat(restricted.contains("SMTP_FROM")).isTrue();
        assertThat(restricted.contains("PASSWORD_MIN_LENGTH")).isFalse();
        assertThat(restricted.contains(null)).isFalse();
    }
}
