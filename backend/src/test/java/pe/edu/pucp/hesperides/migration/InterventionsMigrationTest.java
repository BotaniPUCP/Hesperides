package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

/** Tests only disposable databases; never loads application datasource settings or .env. */
@Testcontainers
class InterventionsMigrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate fresh;
    private static JdbcTemplate upgrade;
    private static Map<String, TableSnapshot> beforeRows;
    private static List<Map<String, Object>> beforeHistory;

    private record TableSnapshot(List<String> rows, List<String> definition) { }

    @BeforeAll
    static void migrateDisposableDatabases() {
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        admin.execute("CREATE DATABASE interventions_fresh");
        admin.execute("CREATE DATABASE interventions_upgrade");
        fresh = database("interventions_fresh");
        upgrade = database("interventions_upgrade");

        flyway(fresh).migrate();
        seedPeople(fresh);

        Flyway.configure().dataSource(upgrade.getDataSource())
                .locations("classpath:db/migration").target("21").load().migrate();
        seedPeople(upgrade);
        seedExistingData(upgrade);
        beforeRows = snapshot(upgrade);
        beforeHistory = migrationHistory(upgrade, 21);
        flyway(upgrade).migrate();
    }

    private static JdbcTemplate database(String name) {
        String url = "jdbc:postgresql://" + postgres.getHost() + ":"
                + postgres.getMappedPort(5432) + "/" + name;
        return new JdbcTemplate(new DriverManagerDataSource(
                url, postgres.getUsername(), postgres.getPassword()));
    }

    private static Flyway flyway(JdbcTemplate jdbc) {
        return Flyway.configure().dataSource(jdbc.getDataSource())
                .locations("classpath:db/migration").cleanDisabled(true).load();
    }

    @Test
    void migratesAnEmptyDatabaseTo22WithoutImplementingIncidentsOrContracts() {
        assertThat(flyway(fresh).info().current().getVersion()).isEqualTo(MigrationVersion.fromVersion("22"));
        assertThat(fresh.queryForList("""
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
                AND tablename IN ('interventions', 'intervention_locations', 'intervention_elements',
                    'intervention_evidences', 'intervention_events', 'intervention_submissions')
                """, String.class)).hasSize(6);
        assertThat(fresh.queryForObject("SELECT to_regclass('public.incidents')::text", String.class)).isNull();
        assertThat(fresh.queryForObject("SELECT to_regclass('public.contracts')::text", String.class)).isNull();
        assertThat(fresh.queryForObject("""
                SELECT count(*) FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_STATUS'
                """, Integer.class)).isEqualTo(7);
        assertThat(catalog(fresh, "MEASUREMENT_UNIT", "UNIT"))
                .isNotEqualTo(catalog(fresh, "INCIDENT_SOURCE", "UNIT"));
        assertThatCode(() -> flyway(fresh).validate()).doesNotThrowAnyException();
    }

    @Test
    void upgrading21PreservesEveryExistingRowAndTableDefinition() {
        Map<String, TableSnapshot> after = snapshot(upgrade);
        assertThat(beforeRows.keySet()).contains("users", "teams", "maintenance_frequencies",
                "green_elements", "zones", "places", "species_photos", "map_data_version");
        beforeRows.forEach((table, previous) -> {
            TableSnapshot current = after.get(table);
            assertThat(current).as("existing table %s", table).isNotNull();
            assertThat(current.definition()).as("columns, indexes and constraints of %s", table)
                    .containsExactlyElementsOf(previous.definition());
            if (List.of("catalog_types", "catalog_items").contains(table)) {
                assertThat(current.rows()).as("original catalog rows of %s", table)
                        .containsAll(previous.rows());
            } else {
                assertThat(current.rows()).as("all existing rows of %s", table)
                        .containsExactlyElementsOf(previous.rows());
            }
        });
        assertThat(after.size()).isEqualTo(beforeRows.size() + 6);
        assertThat(migrationHistory(upgrade, 21)).containsExactlyElementsOf(beforeHistory);
        assertThatCode(() -> flyway(upgrade).validate()).doesNotThrowAnyException();
    }

    @Test
    void existingCustomizedCatalogItemIsNeitherRelabelledNorReactivated() {
        assertThat(upgrade.queryForMap("""
                SELECT ci.label, ci.is_active, ci.metadata->>'retained' AS retained,
                       ci.deleted_at IS NOT NULL AS historical
                FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'MEASUREMENT_UNIT' AND ci.code = 'UNIT'
                """)).containsEntry("label", "Unidad personalizada")
                .containsEntry("is_active", false).containsEntry("retained", "yes")
                .containsEntry("historical", true);
    }

    @Test
    void repeatingMigrateDoesNotDuplicateCatalogsOrChangeAppliedChecksums() {
        List<Map<String, Object>> history = migrationHistory(upgrade, 22);
        Map<String, TableSnapshot> catalogs = snapshot(upgrade);
        assertThat(flyway(upgrade).migrate().migrationsExecuted).isZero();
        assertThat(migrationHistory(upgrade, 22)).containsExactlyElementsOf(history);
        Map<String, TableSnapshot> after = snapshot(upgrade);
        assertThat(after.get("catalog_types")).isEqualTo(catalogs.get("catalog_types"));
        assertThat(after.get("catalog_items")).isEqualTo(catalogs.get("catalog_items"));
    }

    @Test
    void storesThreeIndependentExecutionsWithoutRequiringASection() {
        rollback(jdbc -> {
            long work = work(jdbc);
            long a = location(jdbc, work, UUID.randomUUID());
            long b = location(jdbc, work, UUID.randomUUID());
            long c = location(jdbc, work, UUID.randomUUID());
            jdbc.update("""
                    UPDATE intervention_locations SET status_item_id = ?, attempt_number = 1,
                    started_at = TIMESTAMP '2026-10-22 09:00:00',
                    completed_at = TIMESTAMP '2026-10-22 10:00:00', executed_by_user_id = ?,
                    progress_quantity = 2, executed_quantity = 2 WHERE id = ?
                    """, catalog(jdbc, "INTERVENTION_STATUS", "COMPLETED"), person(jdbc, "OPERARIO"), a);
            jdbc.update("""
                    UPDATE intervention_locations SET status_item_id = ?, attempt_number = 1,
                    started_at = TIMESTAMP '2026-10-22 09:30:00', executed_by_user_id = ?,
                    progress_quantity = 1 WHERE id = ?
                    """, catalog(jdbc, "INTERVENTION_STATUS", "IN_PROGRESS"), person(jdbc, "SUPERVISOR"), b);
            assertThat(jdbc.queryForList("""
                    SELECT l.id, ci.code, l.progress_quantity, l.executed_quantity, l.zone_id
                    FROM intervention_locations l JOIN catalog_items ci ON ci.id = l.status_item_id
                    WHERE l.intervention_id = ? ORDER BY l.id
                    """, work)).extracting(row -> row.get("id"), row -> row.get("code"),
                    row -> row.get("progress_quantity"), row -> row.get("executed_quantity"), row -> row.get("zone_id"))
                    .containsExactly(tuple(a, "COMPLETED", new BigDecimal("2.000"), new BigDecimal("2.000"), null),
                            tuple(b, "IN_PROGRESS", new BigDecimal("1.000"), null, null),
                            tuple(c, "ASSIGNED", null, null, null));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM interventions", Integer.class)).isEqualTo(1);
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"elements", "evidences", "events"})
    void aChildCannotReferToALocationOfAnotherWork(String kind) {
        rollback(jdbc -> {
            long owner = work(jdbc);
            long other = work(jdbc);
            long site = location(jdbc, owner, UUID.randomUUID());
            assertSqlState("23503", () -> {
                switch (kind) {
                    case "elements" -> jdbc.update("""
                            INSERT INTO intervention_elements (intervention_id, intervention_location_id, green_element_id)
                            VALUES (?, ?, (SELECT min(id) FROM green_elements))
                            """, other, site);
                    case "evidences" -> evidence(jdbc, other, site, UUID.randomUUID());
                    case "events" -> jdbc.update("""
                            INSERT INTO intervention_events (intervention_id, intervention_location_id, attempt_number,
                                action_code, actor_user_id, to_status_item_id)
                            VALUES (?, ?, 0, 'TEST_EVENT', ?, ?)
                            """, other, site, person(jdbc, "SUPERVISOR"), catalog(jdbc, "INTERVENTION_STATUS", "ASSIGNED"));
                    default -> throw new IllegalArgumentException(kind);
                }
            });
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"negativeQuantity", "quantityWithoutUnit", "selfValidation", "completionBeforeStart"})
    void rejectsInvalidLocalExecution(String invalid) {
        rollback(jdbc -> {
            long site = location(jdbc, work(jdbc), UUID.randomUUID());
            long actor = person(jdbc, "OPERARIO");
            assertSqlState("23514", () -> {
                switch (invalid) {
                    case "negativeQuantity" -> jdbc.update("UPDATE intervention_locations SET progress_quantity = -1 WHERE id = ?", site);
                    case "quantityWithoutUnit" -> jdbc.update("UPDATE intervention_locations SET unit_item_id = NULL WHERE id = ?", site);
                    case "selfValidation" -> jdbc.update("""
                            UPDATE intervention_locations SET started_at = TIMESTAMP '2026-10-22 09:00:00',
                            completed_at = TIMESTAMP '2026-10-22 10:00:00', validated_at = TIMESTAMP '2026-10-22 11:00:00',
                            executed_by_user_id = ?, validated_by_user_id = ? WHERE id = ?
                            """, actor, actor, site);
                    case "completionBeforeStart" -> jdbc.update("""
                            UPDATE intervention_locations SET started_at = TIMESTAMP '2026-10-22 10:00:00',
                            completed_at = TIMESTAMP '2026-10-22 09:00:00', executed_by_user_id = ? WHERE id = ?
                            """, actor, site);
                    default -> throw new IllegalArgumentException(invalid);
                }
            });
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"locations", "evidences"})
    void aSoftDeletedReferenceCannotBeReused(String kind) {
        rollback(jdbc -> {
            long work = work(jdbc);
            UUID reference = UUID.randomUUID();
            long site = location(jdbc, work, reference);
            if (kind.equals("locations")) {
                jdbc.update("UPDATE intervention_locations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", site);
                assertSqlState("23505", () -> location(jdbc, work, reference));
            } else {
                long photo = evidence(jdbc, work, site, reference);
                jdbc.update("UPDATE intervention_evidences SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", photo);
                assertSqlState("23505", () -> evidence(jdbc, work, site, reference));
            }
        });
    }

    @Test
    void aPendingPhotoCanBeReceivedButCannotBeMarkedUploadedWithoutItsFile() {
        rollback(jdbc -> {
            long work = work(jdbc);
            long photo = evidence(jdbc, work, location(jdbc, work, UUID.randomUUID()), UUID.randomUUID());
            assertThat(jdbc.queryForObject("SELECT uploaded_at IS NULL AND storage_key IS NULL FROM intervention_evidences WHERE id = ?",
                    Boolean.class, photo)).isTrue();
            jdbc.update("""
                    UPDATE intervention_evidences SET uploaded_at = CURRENT_TIMESTAMP, storage_key = 'interventions/test/photo.jpg',
                    content_type = 'image/jpeg', size_bytes = 100, content_sha256 = ? WHERE id = ?
                    """, "a".repeat(64), photo);
            assertThat(jdbc.queryForObject("SELECT uploaded_at IS NOT NULL FROM intervention_evidences WHERE id = ?",
                    Boolean.class, photo)).isTrue();
        });
        rollback(jdbc -> {
            long work = work(jdbc);
            long photo = evidence(jdbc, work, location(jdbc, work, UUID.randomUUID()), UUID.randomUUID());
            assertSqlState("23514", () -> jdbc.update(
                    "UPDATE intervention_evidences SET uploaded_at = CURRENT_TIMESTAMP WHERE id = ?", photo));
        });
    }

    @Test
    void generatedCodesDoNotTruncateAfterSixDigits() {
        rollback(jdbc -> {
            jdbc.queryForObject("SELECT setval('intervention_code_seq', 999999, true)", Long.class);
            assertThat(jdbc.queryForObject("SELECT next_intervention_code()", String.class)).isEqualTo("INT-1000000");
            assertThat(jdbc.queryForObject("SELECT next_intervention_code()", String.class)).isEqualTo("INT-1000001");
        });
    }

    private static void rollback(Consumer<JdbcTemplate> action) {
        TransactionTemplate transaction = new TransactionTemplate(new DataSourceTransactionManager(fresh.getDataSource()));
        transaction.executeWithoutResult(status -> {
            try {
                action.accept(fresh);
            } finally {
                status.setRollbackOnly();
            }
        });
    }

    private static void assertSqlState(String state, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(DataIntegrityViolationException.class).satisfies(error -> {
            Throwable cause = ((DataIntegrityViolationException) error).getMostSpecificCause();
            assertThat(cause).isInstanceOf(SQLException.class);
            assertThat(((SQLException) cause).getSQLState()).isEqualTo(state);
        });
    }

    private static long catalog(JdbcTemplate jdbc, String type, String code) {
        return jdbc.queryForObject("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = ? AND ci.code = ?
                """, Long.class, type, code);
    }

    private static long person(JdbcTemplate jdbc, String role) {
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class,
                "migration-" + role.toLowerCase(java.util.Locale.ROOT) + "@hesperides.test");
    }

    private static long work(JdbcTemplate jdbc) {
        return jdbc.queryForObject("""
                INSERT INTO interventions (intervention_class_item_id, intervention_type_item_id, planning_status_item_id,
                    team_id, assigned_to_user_id, assigned_by_user_id, created_by_user_id, scheduled_date, origin_item_id, reported_by_item_id)
                VALUES (?, (SELECT ci.id FROM catalog_items ci WHERE ci.parent_item_id = ? ORDER BY ci.id LIMIT 1), ?,
                    (SELECT id FROM teams WHERE code = 'MIGRATION-22'), ?, ?, ?, DATE '2026-10-23', ?, ?) RETURNING id
                """, Long.class, catalog(jdbc, "INTERVENTION_CLASS", "PODA"), catalog(jdbc, "INTERVENTION_CLASS", "PODA"),
                catalog(jdbc, "INTERVENTION_STATUS", "ASSIGNED"), person(jdbc, "OPERARIO"), person(jdbc, "COORDINADOR"),
                person(jdbc, "COORDINADOR"), catalog(jdbc, "INTERVENTION_ORIGIN", "MAINTENANCE"), catalog(jdbc, "INCIDENT_SOURCE", "NONE"));
    }

    private static long location(JdbcTemplate jdbc, long work, UUID reference) {
        return jdbc.queryForObject("""
                INSERT INTO intervention_locations (intervention_id, client_reference, location, status_item_id, unit_item_id, requested_quantity)
                VALUES (?, ?, ST_SetSRID(ST_MakePoint(-77.079, -12.069), 4326), ?, ?, 2) RETURNING id
                """, Long.class, work, reference, catalog(jdbc, "INTERVENTION_STATUS", "ASSIGNED"), catalog(jdbc, "MEASUREMENT_UNIT", "UNIT"));
    }

    private static long evidence(JdbcTemplate jdbc, long work, long site, UUID reference) {
        return jdbc.queryForObject("""
                INSERT INTO intervention_evidences (intervention_id, intervention_location_id, attempt_number, client_reference,
                    moment_item_id, uploaded_by_user_id) VALUES (?, ?, 1, ?, ?, ?) RETURNING id
                """, Long.class, work, site, reference, catalog(jdbc, "EVIDENCE_MOMENT", "BEFORE"), person(jdbc, "OPERARIO"));
    }

    private static void seedPeople(JdbcTemplate jdbc) {
        for (String role : List.of("COORDINADOR", "SUPERVISOR", "OPERARIO")) {
            jdbc.update("""
                    INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                    VALUES (?, 'test-only-unused-hash', 'Migration', ?, ?)
                    """, "migration-" + role.toLowerCase(java.util.Locale.ROOT) + "@hesperides.test", role, catalog(jdbc, "ROLE", role));
        }
        jdbc.update("INSERT INTO teams (code, name, supervisor_user_id) VALUES ('MIGRATION-22', 'Migration test team', ?)",
                person(jdbc, "SUPERVISOR"));
        jdbc.update("""
                INSERT INTO team_members (team_id, user_id) VALUES
                ((SELECT id FROM teams WHERE code = 'MIGRATION-22'), ?)
                """, person(jdbc, "OPERARIO"));
    }

    private static void seedExistingData(JdbcTemplate jdbc) {
        jdbc.update("""
                INSERT INTO catalog_types (code, name, is_system) VALUES ('MEASUREMENT_UNIT', 'Existing units', false)
                ON CONFLICT (code) DO NOTHING
                """);
        jdbc.update("""
                INSERT INTO catalog_items (catalog_type_id, code, label, is_active, metadata, deleted_at)
                VALUES ((SELECT id FROM catalog_types WHERE code = 'MEASUREMENT_UNIT'), 'UNIT',
                    'Unidad personalizada', false, '{"retained":"yes"}', TIMESTAMP '2026-10-01 10:00:00')
                """);
        jdbc.update("""
                UPDATE green_elements SET height_m = 9.876, updated_at = TIMESTAMP '2026-10-01 09:00:00'
                WHERE id = (SELECT min(id) FROM green_elements)
                """);
        jdbc.update("""
                INSERT INTO maintenance_frequencies (activity_type_item_id, frequency_rule_type_item_id, notes, valid_from)
                VALUES ((SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                            WHERE ct.code='INTERVENTION_TYPE' ORDER BY ci.id LIMIT 1),
                        (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                            WHERE ct.code='FREQUENCY_RULE_TYPE' AND ci.code='ON_DEMAND'),
                        'Preserved maintenance configuration', DATE '2026-09-01')
                """);
        jdbc.update("""
                INSERT INTO species_photos (species_id, storage_key, thumbnail_storage_key, content_type, size_bytes,
                    uploaded_by_user_id, sort_order, author, license)
                VALUES ((SELECT min(id) FROM species), 'preserved/photo.jpg', 'preserved/thumb.jpg',
                    'image/jpeg', 100, ?, 1, 'Existing author', 'Existing license')
                """, person(jdbc, "SUPERVISOR"));
        jdbc.update("""
                INSERT INTO places (name, kind_item_id, category_item_id, own_geometry)
                VALUES ('Preserved migration place',
                    (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='PLACE_KIND' AND ci.code='OUTDOOR'),
                    (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='REFERENCE_CATEGORY' ORDER BY ci.id LIMIT 1),
                    ST_GeomFromText('POLYGON((-77.080 -12.070,-77.079 -12.070,-77.079 -12.069,-77.080 -12.070))',4326))
                """);
    }

    private static Map<String, TableSnapshot> snapshot(JdbcTemplate jdbc) {
        Map<String, TableSnapshot> result = new LinkedHashMap<>();
        for (String table : jdbc.queryForList("""
                SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'flyway_schema_history'
                ORDER BY tablename
                """, String.class)) {
            // Identifiers originate from PostgreSQL metadata and are quoted, never from user input.
            String quoted = "\"" + table.replace("\"", "\"\"") + "\"";
            List<String> rows = jdbc.queryForList("SELECT md5(to_jsonb(t)::text) FROM public." + quoted + " t ORDER BY 1", String.class);
            List<String> definition = new java.util.ArrayList<>(jdbc.queryForList("""
                    SELECT a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':' || a.attnotnull || ':' ||
                        coalesce(pg_get_expr(d.adbin,d.adrelid),'')
                    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
                    WHERE n.nspname='public' AND c.relname=? AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum
                    """, String.class, table));
            definition.addAll(jdbc.queryForList("SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=? ORDER BY indexname", String.class, table));
            definition.addAll(jdbc.queryForList("""
                    SELECT con.conname || ':' || pg_get_constraintdef(con.oid) FROM pg_constraint con
                    JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname='public' AND c.relname=? ORDER BY con.conname
                    """, String.class, table));
            result.put(table, new TableSnapshot(rows, definition));
        }
        return result;
    }

    private static List<Map<String, Object>> migrationHistory(JdbcTemplate jdbc, int maximum) {
        return jdbc.queryForList("""
                SELECT version, description, type, script, checksum, success FROM flyway_schema_history
                WHERE version::integer <= ? ORDER BY installed_rank
                """, maximum);
    }
}
