package pe.edu.pucp.hesperides.modules.incidents;

import pe.edu.pucp.hesperides.support.TestDatabase;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.ReviewIncidentRequest;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentsService;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.pe.edu.pucp.hesperides=INFO"})
@ActiveProfiles("dev")
@Testcontainers
@Transactional
class DemoIncidentsSeedTest {
    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired IncidentsService service;
    @Autowired EntityManager entityManager;
    @Autowired Flyway flyway;

    @Test
    void seedPopulatesTheWorkflowAndRerunsPreserveDemoChanges() throws Exception {
        // Startup must apply the repeatable migration after the versioned schema.
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(jdbc.queryForObject("""
                SELECT script FROM flyway_schema_history
                WHERE success ORDER BY installed_rank DESC LIMIT 1
                """, String.class)).isEqualTo("R__seed_demo_incidents.sql");
        String seed = new ClassPathResource("db/dev-migration/R__seed_demo_incidents.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        String coordinator = "coordinador@demo.invalid";
        String foreman = "capataz@demo.invalid";
        String otherForeman = "otro-capataz@demo.invalid";
        var summary = service.summary(coordinator);
        assertThat(summary.pendingApproval()).isEqualTo(2);
        assertThat(summary.pendingAttention()).isEqualTo(2);
        assertThat(summary.inProgress()).isEqualTo(2);
        assertThat(summary.resolved()).isEqualTo(2);
        assertThat(summary.completedInterventions()).isEqualTo(5);
        assertThat(service.getAll(foreman, null, null, 0, 20).getTotalElements()).isEqualTo(4);
        assertThat(service.getAll(otherForeman, null, null, 0, 20).getTotalElements()).isEqualTo(4);
        assertThat(count("interventions")).isEqualTo(12);
        assertThat(count("incident_status_history")).isEqualTo(20);

        jdbc.execute(seed);
        assertThat(count("users")).isEqualTo(4); // Initial admin plus three demo accounts.
        assertThat(count("teams")).isEqualTo(2);
        assertThat(count("incidents")).isEqualTo(8);
        assertThat(count("interventions")).isEqualTo(12);
        assertThat(count("incident_status_history")).isEqualTo(20);

        long pendingId = incidentId(1);
        var pending = service.getById(pendingId, coordinator).incident();
        var edited = service.update(pendingId, new ReviewIncidentRequest(pending.version(),
                "Descripción ajustada durante la demo", null, null, null,
                null, null, pending.team().id()), coordinator);
        service.approve(pendingId, edited.incident().version(), coordinator);

        long partialId = incidentId(5);
        var partial = service.getById(partialId, foreman);
        assertThat(partial.interventions()).hasSize(2);
        assertThat(partial.interventions().getFirst().status().code()).isEqualTo("COMPLETED");
        assertThat(partial.interventions().getLast().status().code()).isEqualTo("ASSIGNED");
        assertThatThrownBy(() -> service.getById(partialId, otherForeman))
                .isInstanceOf(ResourceNotFoundException.class);
        service.completeIntervention(partialId, partial.interventions().getLast().id(), foreman);
        service.resolve(partialId, foreman);

        entityManager.flush();
        jdbc.execute(seed);
        entityManager.clear();
        var preserved = service.getById(pendingId, coordinator).incident();
        assertThat(preserved.description()).isEqualTo("Descripción ajustada durante la demo");
        assertThat(preserved.originalDescription()).isEqualTo("Rama caída en puerta principal.");
        assertThat(preserved.status().code()).isEqualTo("OPEN");
        assertThat(service.getById(partialId, foreman).incident().status().code()).isEqualTo("RESOLVED");
        assertThat(count("incidents")).isEqualTo(8);
        assertThat(count("interventions")).isEqualTo(12);
        assertThat(count("incident_status_history")).isEqualTo(22);
        assertThat(service.summary(coordinator).completedInterventions()).isEqualTo(6);
    }

    private long count(String table) {
        String query = switch (table) {
            case "users" -> "SELECT count(*) FROM users";
            case "teams" -> "SELECT count(*) FROM teams";
            case "incidents" -> "SELECT count(*) FROM incidents";
            case "interventions" -> "SELECT count(*) FROM interventions";
            case "incident_status_history" -> "SELECT count(*) FROM incident_status_history";
            default -> throw new IllegalArgumentException("Unknown fixture table");
        };
        return jdbc.queryForObject(query, Long.class);
    }

    private long incidentId(int number) {
        return jdbc.queryForObject("SELECT id FROM incidents WHERE client_reference = ?::uuid",
                Long.class, "20000000-0000-4000-8000-" + "%012d".formatted(number));
    }
}
