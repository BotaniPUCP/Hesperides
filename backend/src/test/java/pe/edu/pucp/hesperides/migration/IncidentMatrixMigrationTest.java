package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class IncidentMatrixMigrationTest {
    @Container static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @Test void upgradesExistingApprovedRecordsWithoutRewritingPublishedMigrations() {
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .target("026").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        var before = jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
        long person = jdbc.queryForObject("""
            INSERT INTO users(email,password_hash,first_name,last_name,role_item_id)
            SELECT 'migration@test.invalid','unused','Migration','Test',ci.id FROM catalog_items ci
            JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='ROLE' AND ci.code='COORDINADOR' RETURNING id
            """, Long.class);
        long incident = jdbc.queryForObject("""
            INSERT INTO incidents(original_description,description,status_item_id,reported_by_user_id,approved_by_user_id,
              approved_at,client_reference,request_hash)
            SELECT 'Texto original','Texto revisado',ci.id,?,?,CURRENT_TIMESTAMP,?,repeat('0',64)
            FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_STATUS' AND ci.code='OPEN' RETURNING id
            """, Long.class, person, person, UUID.randomUUID());
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()).load().migrate();
        assertThat(jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL AND version::integer <= 26 ORDER BY installed_rank"))
                .isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT original_description FROM incidents WHERE id=?", String.class, incident)).isEqualTo("Texto original");
        assertThat(jdbc.queryForObject("SELECT official_number FROM incidents WHERE id=?", Long.class, incident)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT nextval('incident_official_number_seq')", Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("""
            SELECT count(*) FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_ROOT_CAUSE'
            """, Long.class)).isEqualTo(15);
        assertThat(jdbc.queryForObject("""
            SELECT count(*) FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_COMPANY'
            """, Long.class)).isEqualTo(37);
    }
}
