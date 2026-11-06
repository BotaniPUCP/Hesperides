package pe.edu.pucp.hesperides.modules.incidents;

import pe.edu.pucp.hesperides.support.TestDatabase;
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
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentsService;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionQueriesRepository;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties={"spring.jpa.show-sql=false","logging.level.pe.edu.pucp.hesperides=INFO"})
@ActiveProfiles("dev") @Testcontainers @Transactional
class DemoIncidentsSeedTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired IncidentsService service;
    @Autowired InterventionQueriesRepository work;
    @Autowired FileStorage storage;
    @Autowired Flyway flyway;

    @Test void seedUsesRealWorkAndMeaningfulOsgExamples() {
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        var summary=service.summary("coordinador@demo.invalid");
        assertThat(summary.dashboard().total()).isEqualTo(12);
        assertThat(summary.pendingApproval()).isEqualTo(3);
        assertThat(summary.pendingCorrection()).isEqualTo(1);
        assertThat(summary.resolutionObserved()).isEqualTo(1);
        assertThat(summary.resolved()).isEqualTo(2);
        assertThat(summary.completedInterventions()).isEqualTo(3);
        assertThat(summary.validatedInterventions()).isEqualTo(2);
        assertThat(summary.dashboard().readyForClosure()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM interventions",Long.class)).isEqualTo(8);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM incident_intervention_links",Long.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT to_regclass('public.incident_interventions') IS NULL",Boolean.class)).isTrue();
        assertThat(service.myReports("capataz@demo.invalid").total()).isEqualTo(8);
        assertThat(service.myReports("otro-capataz@demo.invalid").total()).isEqualTo(4);
        var first=service.getById(id(1),"capataz@demo.invalid");
        assertThat(first.incident().matrix().severity()).isNull();
        var extended=service.getById(id(2),"otro-capataz@demo.invalid");
        assertThat(extended.incident().matrix().rootCauseItem().code()).isEqualTo("AV-09");
        assertThat(extended.linkedInterventions()).hasSize(1);
        assertThat(extended.incident().approvedAt()).isNull();
        assertThat(extended.canCreateIntervention()).isFalse();
        var ready=service.getById(id(9),"coordinador@demo.invalid");
        var closed=service.getById(id(12),"coordinador@demo.invalid");
        assertThat(ready.canResolve()).isTrue();
        assertThat(ready.linkedInterventions().getFirst().id()).isEqualTo(closed.linkedInterventions().getFirst().id());
        assertThat(closed.incident().resolutionSummary()).isNotBlank();
        assertThat(closed.incident().resolvedBy().id()).isEqualTo(closed.incident().approvedBy().id());
        assertThat(closed.incident().closureBusinessDays()).isNotNull();
        for (var row:jdbc.queryForList("SELECT intervention_id,storage_key FROM intervention_evidences WHERE uploaded_at IS NOT NULL")) {
            assertThat(storage.read((String)row.get("storage_key"))).isNotEmpty();
            assertThat(work.detail(((Number)row.get("intervention_id")).longValue())).isPresent();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_evidences",Long.class)).isEqualTo(4);
    }

    @Test void rerunningCurrentSeedDoesNotDuplicateOrResetEditedReports() throws Exception {
        String seed=new ClassPathResource("db/dev-migration/R__seed_demo_incidents.sql").getContentAsString(StandardCharsets.UTF_8);
        var pending=service.getById(id(1),"coordinador@demo.invalid").incident();
        var changed=service.update(pending.id(),new ReviewIncidentRequest(pending.version(),"Dato corregido durante la demostración",
                null,null,null,null,null,pending.team().id()),"coordinador@demo.invalid");
        jdbc.execute(seed);jdbc.execute(seed);
        assertThat(service.getById(id(1),"coordinador@demo.invalid").incident().description()).isEqualTo(changed.incident().description());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM incidents WHERE deleted_at IS NULL",Long.class)).isEqualTo(12);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM interventions",Long.class)).isEqualTo(8);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM incident_intervention_links",Long.class)).isEqualTo(10);
    }
    private long id(int n) {
        return jdbc.queryForObject("SELECT id FROM incidents WHERE client_reference=?::uuid",Long.class,"30000000-0000-4000-8000-"+"%012d".formatted(n));
    }
}
