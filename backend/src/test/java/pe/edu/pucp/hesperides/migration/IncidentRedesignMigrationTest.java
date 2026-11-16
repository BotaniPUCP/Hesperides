package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-201 §4: el rediseño retira la matriz OSG y lleva los datos al flujo de tres estados. */
@Testcontainers
class IncidentRedesignMigrationTest {

    @Container static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();
    private static JdbcTemplate jdbc;
    private static List<Map<String, Object>> checksumsBefore;
    private static long pendingId;
    private static long approvedId;
    private static long resolvedId;

    @BeforeAll
    static void migrateFromTheMatrixSchema() {
        flyway("051").migrate();
        jdbc = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        checksumsBefore = checksumsUpTo(51);
        long user = jdbc.queryForObject("""
            INSERT INTO users(email,password_hash,first_name,last_name,role_item_id)
            SELECT 'capataz@test.invalid','unused','Capataz','Prueba',ci.id FROM catalog_items ci
            JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='ROLE' AND ci.code='SUPERVISOR' RETURNING id
            """, Long.class);
        pendingId = incident(user, "PENDING_APPROVAL", "2026-03-01T10:00:00Z", false, false);
        approvedId = incident(user, "OPEN", "2026-03-02T10:00:00Z", true, false);
        resolvedId = incident(user, "RESOLVED", "2025-12-31T10:00:00Z", true, true);
        jdbc.update("""
            INSERT INTO incident_impacts(incident_id,impact_item_id)
            SELECT ?,ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_IMPACT' LIMIT 1
            """, approvedId);
        flyway(null).migrate();
    }

    private static Flyway flyway(String target) {
        var config = Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
        return (target == null ? config : config.target(target)).load();
    }

    private static List<Map<String, Object>> checksumsUpTo(int version) {
        return jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL "
                + "AND version::integer<=? ORDER BY installed_rank", version);
    }

    private static long incident(long user, String status, String createdAt, boolean approved, boolean resolved) {
        return jdbc.queryForObject("""
            INSERT INTO incidents(original_description,description,status_item_id,reported_by_user_id,approved_by_user_id,
              approved_at,resolved_at,resolution_summary,client_reference,request_hash,created_at,official_number)
            SELECT 'Rama rajada','Rama rajada',ci.id,?,
              CASE WHEN ? THEN ? END, CASE WHEN ? THEN ?::timestamptz + interval '1 hour' END,
              CASE WHEN ? THEN ?::timestamptz + interval '2 days' END, CASE WHEN ? THEN 'Se podó' END,
              ?,repeat('0',64),?::timestamptz, CASE WHEN ? THEN nextval('incident_official_number_seq') END
            FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_STATUS' AND ci.code=? RETURNING id
            """, Long.class, user, approved, user, approved, createdAt, resolved, createdAt, resolved,
                UUID.randomUUID(), createdAt, approved, status);
    }

    private static boolean tableExists(String table) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table));
    }

    private static List<String> incidentColumns() {
        return jdbc.queryForList("SELECT column_name FROM information_schema.columns WHERE table_name='incidents'", String.class);
    }

    private static String statusOf(long id) {
        return jdbc.queryForObject("SELECT s.code FROM incidents i JOIN catalog_items s ON s.id=i.status_item_id WHERE i.id=?",
                String.class, id);
    }

    @Test
    void publishedMigrationsKeepTheirChecksums() {
        assertThat(checksumsUpTo(51)).isEqualTo(checksumsBefore);
    }

    @Test
    void retiresTheMatrixTablesColumnsAndCatalogs() {
        assertThat(tableExists("incident_impacts")).isFalse();
        assertThat(tableExists("incident_interventions")).isFalse();
        assertThat(incidentColumns()).doesNotContain("official_number", "severity_item_id", "root_cause",
                "closure_business_days", "correction_reason", "resolution_observation", "approved_at", "resolved_at");
        assertThat(jdbc.queryForObject("""
            SELECT count(*) FROM catalog_types WHERE code IN ('INCIDENT_SERVICE_GROUP','INCIDENT_SERVICE','INCIDENT_COMPANY',
              'INCIDENT_PROCESS','INCIDENT_SUBPROCESS','INCIDENT_ROOT_CAUSE','INCIDENT_IMPACT','INCIDENT_EVENT',
              'INCIDENT_SEVERITY','INCIDENT_ACTION_PURPOSE')
            """, Long.class)).isZero();
        assertThat(jdbc.queryForList("SELECT column_name FROM information_schema.columns "
                + "WHERE table_name='incident_intervention_links'", String.class)).doesNotContain("purpose_item_id");
    }

    @Test
    void mapsTheOldStatesToTheThreeOfTheRedesign() {
        assertThat(statusOf(pendingId)).isEqualTo("REPORTED");
        assertThat(statusOf(approvedId)).isEqualTo("REPORTED");
        assertThat(statusOf(resolvedId)).isEqualTo("CLOSED");
        assertThat(jdbc.queryForList("""
            SELECT ci.code FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_STATUS' AND ci.is_active AND ci.deleted_at IS NULL ORDER BY ci.sort_order
            """, String.class)).containsExactly("REPORTED", "IN_PROGRESS", "CLOSED");
    }

    @Test
    void approvalBecomesActivationAndResolutionBecomesClosure() {
        assertThat(jdbc.queryForObject("SELECT activated_at IS NULL FROM incidents WHERE id=?", Boolean.class, pendingId)).isTrue();
        assertThat(jdbc.queryForObject("SELECT activated_at IS NOT NULL AND activated_by_user_id IS NOT NULL FROM incidents WHERE id=?",
                Boolean.class, approvedId)).isTrue();
        assertThat(jdbc.queryForObject("SELECT closed_at IS NOT NULL AND resolution_summary='Se podó' FROM incidents WHERE id=?",
                Boolean.class, resolvedId)).isTrue();
    }

    @Test
    void everyIncidentGetsAYearlyCodeInReceptionOrder() {
        assertThat(jdbc.queryForObject("SELECT code FROM incidents WHERE id=?", String.class, resolvedId)).isEqualTo("INC-2025-0001");
        assertThat(jdbc.queryForObject("SELECT code FROM incidents WHERE id=?", String.class, pendingId)).isEqualTo("INC-2026-0001");
        assertThat(jdbc.queryForObject("SELECT code FROM incidents WHERE id=?", String.class, approvedId)).isEqualTo("INC-2026-0002");
        assertThat(jdbc.queryForObject("SELECT last_number FROM incident_code_counters WHERE year=2026", Long.class)).isEqualTo(2L);
    }

    @Test
    void seedsProvisionalDeadlineParameters() {
        assertThat(jdbc.queryForList("""
            SELECT value FROM system_parameters WHERE code IN
              ('INCIDENT_DEADLINE_HIGH_HOURS','INCIDENT_DEADLINE_MEDIUM_HOURS','INCIDENT_DEADLINE_LOW_HOURS')
              AND deleted_at IS NULL ORDER BY value::integer
            """, String.class)).containsExactly("24", "48", "72");
    }

    @Test
    void seedsTheProvisionalIncidentTypesUnderTheirClasses() {
        assertThat(jdbc.queryForObject("""
            SELECT p.code FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            JOIN catalog_items p ON p.id=ci.parent_item_id WHERE ct.code='INCIDENT_TYPE' AND ci.code='BRANCH_AT_RISK'
            """, String.class)).isEqualTo("TREES");
        assertThat(jdbc.queryForObject("""
            SELECT count(*) FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_CLASS' AND ci.is_active
            """, Long.class)).isEqualTo(5L);
    }
}
