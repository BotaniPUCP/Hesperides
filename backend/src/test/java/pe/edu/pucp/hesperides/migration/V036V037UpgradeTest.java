package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.sql.DriverManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Confirms the lifecycle migrations upgrade an existing V035 schema in order, on an ephemeral PostGIS database. */
class V036V037UpgradeTest {

    @Test
    void upgradesV035ToV037SequentiallyOnAnEphemeralDatabase() throws Exception {
        try (PostgreSQLContainer<?> postgres = TestDatabase.newContainer()) {
            postgres.start();
            Flyway throughV035 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("35"))
                    .load();
            throughV035.migrate();
            assertThat(version(postgres)).isEqualTo("035");

            Flyway throughV037 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("37"))
                    .load();
            throughV037.migrate();

            assertThat(version(postgres)).isEqualTo("037");
            assertThat(migrationApplied(postgres, "036")).isTrue();
            assertThat(migrationApplied(postgres, "037")).isTrue();
        }
    }

    @Test
    void v037FailsClosedOnCodesAlreadyReusedBeforeThePermanentIndex() throws Exception {
        try (PostgreSQLContainer<?> postgres = TestDatabase.newContainer()) {
            postgres.start();
            Flyway throughV036 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("36"))
                    .load();
            throughV036.migrate();

            try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                 var statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE green_elements SET is_active=FALSE,deleted_at=CURRENT_TIMESTAMP "
                        + "WHERE code='EV-000001'");
                statement.executeUpdate("""
                        INSERT INTO green_elements (code,element_type_item_id,species_id,location,registered_by_user_id)
                        SELECT 'EV-000001', e.element_type_item_id, e.species_id,
                               ST_SetSRID(ST_MakePoint(-77.071,-12.071),4326),
                               (SELECT id FROM users WHERE email='admin@pucp.edu.pe')
                          FROM green_elements e WHERE e.code='EV-000001' LIMIT 1
                        """);
            }

            Flyway v037 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("37"))
                    .load();
            assertThatThrownBy(v037::migrate)
                    .isInstanceOf(FlywayException.class)
                    .satisfies(failure -> {
                        Throwable cause = failure;
                        while (cause.getCause() != null) cause = cause.getCause();
                        assertThat(cause).hasMessageContaining(
                                "Cannot reserve historical specimen codes: duplicate values already exist");
                    });
            assertThat(version(postgres)).isEqualTo("036");
            assertThat(indexExists(postgres, "idx_green_elements_code_active")).isTrue();
            assertThat(indexExists(postgres, "idx_green_elements_code_historical")).isFalse();
        }
    }

    @Test
    void v036FailsClosedOnHistoricalSlugReuse() throws Exception {
        try (PostgreSQLContainer<?> postgres = TestDatabase.newContainer()) {
            postgres.start();
            Flyway throughV035 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("35"))
                    .load();
            throughV035.migrate();

            try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                 var statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE species SET is_active=FALSE,deleted_at=CURRENT_TIMESTAMP "
                        + "WHERE slug='schinus-molle'");
                statement.executeUpdate("""
                        INSERT INTO species (scientific_name,slug,species_type_item_id,is_active)
                        SELECT 'Schinus nova','schinus-molle',s.species_type_item_id,TRUE
                          FROM species s WHERE s.id=(SELECT id FROM species WHERE slug='schinus-molle' LIMIT 1)
                        """);
            }

            Flyway v036 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("36"))
                    .load();
            assertMigrationAborts(v036, "Cannot reserve historical species slugs: duplicate values already exist");
            assertThat(version(postgres)).isEqualTo("035");
            assertThat(indexExists(postgres, "idx_species_slug_active")).isTrue();
            assertThat(indexExists(postgres, "idx_species_slug_historical")).isFalse();
        }
    }

    @Test
    void v037FailsClosedOnActiveRowsAlreadyMarkedAsDeleted() throws Exception {
        try (PostgreSQLContainer<?> postgres = TestDatabase.newContainer()) {
            postgres.start();
            Flyway throughV036 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("36"))
                    .load();
            throughV036.migrate();
            try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                 var statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE green_elements SET deleted_at=CURRENT_TIMESTAMP WHERE code='EV-000001'");
            }

            Flyway v037 = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("37"))
                    .load();
            assertMigrationAborts(v037,
                    "Cannot enforce lifecycle integrity: a logically deleted species or specimen is active");
            assertThat(version(postgres)).isEqualTo("036");
            assertThat(indexExists(postgres, "idx_green_elements_code_active")).isTrue();
            assertThat(indexExists(postgres, "idx_green_elements_code_historical")).isFalse();
        }
    }

    private static void assertMigrationAborts(Flyway flyway, String rootCauseMessage) {
        assertThatThrownBy(flyway::migrate)
                .isInstanceOf(FlywayException.class)
                .satisfies(failure -> {
                    Throwable cause = failure;
                    while (cause.getCause() != null) cause = cause.getCause();
                    assertThat(cause).hasMessageContaining(rootCauseMessage);
                });
    }

    private static String version(PostgreSQLContainer<?> postgres) throws Exception {
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1")) {
            if (!result.next()) throw new AssertionError("Flyway has no successful migration history");
            return result.getString(1);
        }
    }

    private static boolean migrationApplied(PostgreSQLContainer<?> postgres, String version) throws Exception {
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.prepareStatement(
                     "SELECT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version=? AND success)")) {
            statement.setString(1, version);
            try (var result = statement.executeQuery()) {
                result.next();
                return result.getBoolean(1);
            }
        }
    }

    private static boolean indexExists(PostgreSQLContainer<?> postgres, String name) throws Exception {
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.prepareStatement("SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname=?)")) {
            statement.setString(1, name);
            try (var result = statement.executeQuery()) {
                result.next();
                return result.getBoolean(1);
            }
        }
    }
}
