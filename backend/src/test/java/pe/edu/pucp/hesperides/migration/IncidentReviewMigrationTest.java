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
class IncidentReviewMigrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    @Test void preservesHistoricalClosuresAndWorkWithoutInventingCanonicalExecution() {
        Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).target("027").load().migrate();
        var jdbc=new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()));
        var checksums=jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
        long user=jdbc.queryForObject("""
          INSERT INTO users(email,password_hash,first_name,last_name,role_item_id)
          SELECT 'historical@test.invalid','unused','Historical','Test',ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
          WHERE ct.code='ROLE' AND ci.code='SUPERVISOR' RETURNING id
          """,Long.class);
        long incident=jdbc.queryForObject("""
          INSERT INTO incidents(original_description,description,status_item_id,reported_by_user_id,approved_by_user_id,
            approved_at,resolved_at,client_reference,request_hash,official_number)
          SELECT 'Texto histórico','Texto histórico',ci.id,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,repeat('0',64),nextval('incident_official_number_seq')
          FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='INCIDENT_STATUS' AND ci.code='RESOLVED' RETURNING id
          """,Long.class,user,user,UUID.randomUUID());
        jdbc.update("""
          INSERT INTO incident_interventions(incident_id,description,status_item_id,recorded_by_user_id,completed_by_user_id,completed_at,client_reference,request_hash)
          SELECT ?,'Trabajo histórico',ci.id,?,?,CURRENT_TIMESTAMP,?,repeat('0',64)
          FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='INTERVENTION_STATUS' AND ci.code='COMPLETED'
          """,incident,user,user,UUID.randomUUID());
        Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).load().migrate();
        assertThat(jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL AND version::integer<=27 ORDER BY installed_rank")).isEqualTo(checksums);
        assertThat(jdbc.queryForObject("SELECT resolved_at IS NOT NULL AND resolution_summary IS NULL AND resolved_by_user_id IS NULL FROM incidents WHERE id=?",Boolean.class,incident)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM incident_intervention_links",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM interventions",Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT description FROM incident_interventions WHERE incident_id=? AND replacement_intervention_id IS NULL",String.class,incident)).isEqualTo("Trabajo histórico");
    }
}
