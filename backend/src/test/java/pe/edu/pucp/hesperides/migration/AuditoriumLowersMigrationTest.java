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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * SPEC-108 D-16, 15 nov 2026: el Auditorio Juan Pablo II baja 3,935 m (el `liftM` de su ajuste en el manifiesto),
 * así que su base y su alto bajan lo mismo. La huella no cambia, ni nada más.
 */
@Testcontainers
class AuditoriumLowersMigrationTest {

    private static final String PREVIOUS_VERSION = "58";
    private static final String LOWERED_VERSION = "59";
    private static final String AUDITORIO = "0587a436-a6b7-4214-8d74-9b4883986521";
    private static final double DROP_M = 3.935;
    /** Las columnas guardan dos decimales. */
    private static final double CENTIMETRE = 0.01;

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate db;
    private static long versionBefore;

    @BeforeAll
    static void migrate() {
        db = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        flyway(PREVIOUS_VERSION).migrate();
        versionBefore = db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class);
        db.execute("""
                CREATE TABLE buildings_before AS
                SELECT id, plan_key, height_m, base_m, md5(ST_AsBinary(footprint)) AS hash FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(LOWERED_VERSION).migrate();
    }

    @Test
    void elAuditorioBajaSuBaseYSuAltoLoMismoQueSuMalla() {
        Map<String, Object> row = db.queryForMap("""
                SELECT b.height_m - f.height_m AS dh, b.base_m - f.base_m AS db FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", AUDITORIO);

        assertThat(((Number) row.get("dh")).doubleValue()).isCloseTo(-DROP_M, within(CENTIMETRE));
        assertThat(((Number) row.get("db")).doubleValue()).isCloseTo(-DROP_M, within(CENTIMETRE));
    }

    @Test
    void nadaMasCambia() {
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN buildings_before f ON f.id = b.id
                WHERE md5(ST_AsBinary(b.footprint)) <> f.hash OR b.height_m IS DISTINCT FROM f.height_m
                   OR b.base_m IS DISTINCT FROM f.base_m""", Integer.class);

        assertThat(changed).isEqualTo(1);
    }

    @Test
    void elMapaSabeQueSusDatosCambiaron() {
        assertThat(db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class)).isGreaterThan(versionBefore);
    }

    private static Flyway flyway(String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }
}
