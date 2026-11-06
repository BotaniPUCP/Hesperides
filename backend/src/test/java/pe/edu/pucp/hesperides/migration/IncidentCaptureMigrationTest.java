package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class IncidentCaptureMigrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    @Test void upgradesWithoutRewritingPublishedMigrationsAndRetiresThePrototypeModel() {
        Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).target("028").load().migrate();
        var jdbc=new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()));
        var old=jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
        Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).load().migrate();
        assertThat(jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL AND version::integer<=28 ORDER BY installed_rank")).isEqualTo(old);
        assertThat(jdbc.queryForObject("SELECT to_regclass('public.incident_interventions') IS NULL",Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='INCIDENT_INTAKE_CHANNEL'",Long.class)).isEqualTo(7);
    }
}
