package pe.edu.pucp.hesperides.modules.incidents;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentMapService;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentQueryService;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** El seed de demostración del rediseño (perfil dev): seis casos, sin trabajo fabricado. */
@SpringBootTest(properties = "spring.jpa.show-sql=false")
@ActiveProfiles("dev")
@Testcontainers
@Transactional
class DemoIncidentsSeedTest {
    @Container static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean IncidentPrefillAgent agent;
    @Autowired JdbcTemplate jdbc;
    @Autowired Flyway flyway;
    @Autowired IncidentQueryService queries;
    @Autowired IncidentMapService map;

    private static final String COORDINATOR = "coordinador@demo.invalid";

    @Test
    void seedsTheNewFlowAndRerunningAddsNothing() throws Exception {
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(count()).isEqualTo(6);
        assertThat(queries.all(COORDINATOR)).filteredOn(i -> !i.active()).hasSize(3);
        assertThat(queries.all(COORDINATOR)).filteredOn(i -> i.active()).hasSize(3);
        assertThat(map.map(COORDINATOR).markers()).extracting(m -> m.deadlineStatus())
                .contains("OVERDUE", "DUE_SOON", "ON_TIME");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM incident_intervention_links", Long.class)).isZero();

        String seed = new ClassPathResource("db/dev-migration/R__seed_demo_incidents.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        jdbc.execute(seed);

        assertThat(count()).isEqualTo(6);
    }

    @Test
    void theOperatorSeesOnlyTheirOwnReport() {
        var own = queries.all("operario@demo.invalid");
        assertThat(own).hasSize(1);
        long foremans = queries.all("capataz@demo.invalid").getFirst().id();
        assertThatThrownBy(() -> queries.get(foremans, "operario@demo.invalid")).isInstanceOf(ResourceNotFoundException.class);
    }

    private long count() {
        return jdbc.queryForObject("SELECT count(*) FROM incidents WHERE client_reference::text LIKE '30000000-%'", Long.class);
    }
}
