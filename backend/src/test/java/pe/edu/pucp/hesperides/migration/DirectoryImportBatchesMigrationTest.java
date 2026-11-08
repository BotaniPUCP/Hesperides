package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** V037: the Directorio joins the common import batches, and its rows remember their batch. */
@Testcontainers
class DirectoryImportBatchesMigrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate jdbc;

    @BeforeAll
    static void migrate() {
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .load().migrate();
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
    }

    private static long batch(String kind) {
        return jdbc.queryForObject("""
                INSERT INTO import_batches (kind, file_name, created_by_user_id, report, expires_at)
                VALUES (?, 'x.csv', (SELECT min(id) FROM users), '{}'::jsonb, CURRENT_TIMESTAMP) RETURNING id""",
                Long.class, kind);
    }

    @Test
    void directoryKindsAreAcceptedAlongsideTheCatastroOnes() {
        assertThat(batch("organizations")).isPositive();
        assertThat(batch("contacts")).isPositive();
        assertThat(batch("specimens")).isPositive();
    }

    @Test
    void anUnknownKindIsStillRejected() {
        assertThatThrownBy(() -> batch("species")).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void organizationsAndContactsRegisteredOneByOneHaveNoBatch() {
        long type = jdbc.queryForObject("""
                SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT'""", Long.class);
        jdbc.update("INSERT INTO organizations (name, type_item_id) VALUES ('Unidad sin lote', ?)", type);
        jdbc.update("INSERT INTO contacts (full_name) VALUES ('Persona sin lote')");

        assertThat(jdbc.queryForObject("SELECT import_batch_id FROM organizations WHERE name = 'Unidad sin lote'",
                Long.class)).isNull();
        assertThat(jdbc.queryForObject("SELECT import_batch_id FROM contacts WHERE full_name = 'Persona sin lote'",
                Long.class)).isNull();
    }

    @Test
    void aRowCanPointToItsBatch() {
        long id = batch("contacts");
        jdbc.update("INSERT INTO contacts (full_name, import_batch_id) VALUES ('Persona con lote', ?)", id);

        assertThat(jdbc.queryForObject("SELECT import_batch_id FROM contacts WHERE full_name = 'Persona con lote'",
                Long.class)).isEqualTo(id);
    }
}
