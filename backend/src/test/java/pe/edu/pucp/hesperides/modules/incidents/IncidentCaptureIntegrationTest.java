package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.IncidentResponse;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** SPEC-201 §3.1-§3.3, §3.7 y aceptación 1, 10 y 11. */
@SpringBootTest @Testcontainers @Transactional
class IncidentCaptureIntegrationTest extends IncidentTestSupport {

    @Test
    void foremanReportsWithTwoFieldsAndItIsSavedNotActive() {
        var sent = capture.create(report("Rama rajada sobre el Pontódromo", "MEDIUM"), UUID.randomUUID(), foreman);

        var incident = sent.detail().incident();
        assertThat(sent.created()).isTrue();
        assertThat(incident.code()).matches("INC-\\d{4}-\\d{4}");
        assertThat(incident.status().code()).isEqualTo("REPORTED");
        assertThat(incident.active()).isFalse();
        assertThat(incident.reportedUrgency().code()).isEqualTo("MEDIUM");
        assertThat(incident.urgency().code()).isEqualTo("MEDIUM");
        assertThat(incident.originalDescription()).isEqualTo("Rama rajada sobre el Pontódromo");
        assertThat(incident.requestedBy().name()).isEqualTo("Áreas verdes (hallazgo en campo)");
        assertThat(incident.team().id()).isEqualTo(teamId);
        assertThat(sent.detail().prefill().status()).isEqualTo("PENDING");
    }

    @Test
    void theDeadlineRunsFromReceptionWithTheCurrentUrgency() {
        var incident = reportAs(foreman).incident();

        assertThat(incident.deadline().status()).isEqualTo("ON_TIME");
        assertThat(Duration.between(incident.createdAt(), incident.deadline().dueAt())).isEqualTo(Duration.ofHours(48));
        assertThat(incident.deadline().met()).isNull();
    }

    @Test
    void reportsByCoordinationOrAdministrationAreBornActive() {
        assertThat(reportAs(coordinator).incident().active()).isTrue();
        assertThat(reportAs(admin).incident().activatedAt()).isNotNull();
    }

    @Test
    void codesAreConsecutiveWithinTheYear() {
        String first = reportAs(foreman).incident().code();
        String second = reportAs(operator).incident().code();

        long firstNumber = Long.parseLong(first.substring(first.lastIndexOf('-') + 1));
        assertThat(second).isEqualTo(first.substring(0, first.lastIndexOf('-') + 1) + String.format("%04d", firstNumber + 1));
    }

    @Test
    void retryingWithTheSameKeyReturnsTheSameIncidentAndOtherContentConflicts() {
        UUID key = UUID.randomUUID();
        var first = capture.create(report("Fuga de agua", "HIGH"), key, foreman);
        var again = capture.create(report("Fuga de agua", "HIGH"), key, foreman);

        assertThat(again.created()).isFalse();
        assertThat(again.detail().incident().id()).isEqualTo(first.detail().incident().id());
        assertThatThrownBy(() -> capture.create(report("Otra cosa", "HIGH"), key, foreman))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void severityMustBeAKnownUrgency() {
        assertThatThrownBy(() -> capture.create(report("Rama", "CRITICAL"), UUID.randomUUID(), foreman))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void operatorReportsAndSeesOnlyTheirOwn() {
        long own = reportAs(operator).incident().id();
        long foremans = reportAs(foreman).incident().id();

        assertThat(queries.all(operator))
                .extracting(IncidentResponse::id).contains(own).doesNotContain(foremans);
        assertThatThrownBy(() -> queries.get(foremans, operator)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void anotherForemanCannotSeeIncidentsOutsideTheirTeams() {
        long id = reportAs(foreman).incident().id();

        assertThatThrownBy(() -> queries.get(id, outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(queries.get(id, coordinator).incident().id()).isEqualTo(id);
    }

    @Test
    void mineCountsOnlyTheReportsSentByTheUser() {
        reportAs(foreman);
        reportAs(operator);

        var mine = queries.mine(foreman);
        assertThat(mine.total()).isEqualTo(1);
        assertThat(mine.notActive()).isEqualTo(1);
        assertThat(mine.recent()).hasSize(1);
    }
}

