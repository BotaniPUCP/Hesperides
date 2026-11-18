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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * SPEC-108 D-17, 15 nov 2026: la escalera que baja de la plaza al patio de ingreso del Auditorio Juan Pablo II, y su
 * descanso, dejan de ser parte de su huella. Nada más cambia.
 */
@Testcontainers
class AuditoriumEntranceStairMigrationTest {

    private static final String PREVIOUS_VERSION = "60";
    private static final String STAIR_VERSION = "61";
    private static final String AUDITORIO = "0587a436-a6b7-4214-8d74-9b4883986521";
    /** Lo que ocupan en planta el tramo y su descanso: 11,86 m de ancho por 2,4 m. */
    private static final double STAIR_M2 = 28.47;
    private static final double TOLERANCE_M2 = 0.1;

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
                SELECT id, plan_key, footprint, height_m, base_m, md5(ST_AsBinary(footprint)) AS hash FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(STAIR_VERSION).migrate();
    }

    @Test
    void laHuellaDelAuditorioPierdeSoloLaEscalera() {
        Double lost = db.queryForObject("""
                SELECT ST_Area(f.footprint::geography) - ST_Area(b.footprint::geography) FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", Double.class, AUDITORIO);
        Double gained = db.queryForObject("""
                SELECT ST_Area(ST_Difference(b.footprint, f.footprint)::geography) FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", Double.class, AUDITORIO);

        assertThat(lost).isCloseTo(STAIR_M2, within(TOLERANCE_M2));
        assertThat(gained).isLessThanOrEqualTo(TOLERANCE_M2);
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
