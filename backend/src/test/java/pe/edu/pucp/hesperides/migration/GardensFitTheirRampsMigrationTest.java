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
 * SPEC-108 D-19, 15 nov 2026: AV-0409 pasa a ser el jardín hundido que dibuja el modelo (519,1 m², antes 584,87) y
 * AV-0408 pierde la esquina de ese jardín y la franja que se montaba sobre la rampa del lado del CIA (461,9 m²,
 * antes 516). Su sector baja lo mismo. Nada más cambia.
 */
@Testcontainers
class GardensFitTheirRampsMigrationTest {

    private static final String PREVIOUS_VERSION = "61";
    private static final String FIT_VERSION = "62";
    private static final double AV_0409_M2 = 519.1;
    private static final double AV_0408_M2 = 461.9;
    private static final double TOLERANCE_M2 = 0.5;

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
                CREATE TABLE zones_before AS
                SELECT id, code, area_m2, md5(ST_AsBinary(boundary)) AS hash FROM zones WHERE deleted_at IS NULL""");
        flyway(FIT_VERSION).migrate();
    }

    private static double area(String code) {
        return db.queryForObject("SELECT area_m2 FROM zones WHERE code = ? AND deleted_at IS NULL", Double.class, code);
    }

    private static double areaBefore(String code) {
        return db.queryForObject("SELECT area_m2 FROM zones_before WHERE code = ?", Double.class, code);
    }

    @Test
    void lasDosAreasQuedanConSuCespedReal() {
        assertThat(area("AV-0409")).isCloseTo(AV_0409_M2, within(TOLERANCE_M2));
        assertThat(area("AV-0408")).isCloseTo(AV_0408_M2, within(TOLERANCE_M2));
    }

    @Test
    void elAreaGuardadaEsLaDeSuContorno() {
        Double off = db.queryForObject("""
                SELECT max(abs(area_m2 - ST_Area(boundary::geography))) FROM zones WHERE code IN ('AV-0408', 'AV-0409')""", Double.class);

        assertThat(off).isLessThan(0.01);
    }

    @Test
    void noSeSolapan() {
        Double overlap = db.queryForObject("""
                SELECT ST_Area(ST_Intersection(a.boundary, b.boundary)::geography) FROM zones a, zones b
                WHERE a.code = 'AV-0408' AND b.code = 'AV-0409'""", Double.class);

        assertThat(overlap).isLessThan(0.01);
    }

    @Test
    void suSectorBajaLoMismo() {
        double lost = areaBefore("AV-0408") - area("AV-0408") + areaBefore("AV-0409") - area("AV-0409");

        assertThat(areaBefore("SEC-VERDE-02") - area("SEC-VERDE-02")).isCloseTo(lost, within(0.01));
    }

    @Test
    void nadaMasCambia() {
        String changed = db.queryForObject("""
                SELECT string_agg(z.code, ',' ORDER BY z.code) FROM zones z JOIN zones_before b ON b.id = z.id
                WHERE md5(ST_AsBinary(z.boundary)) <> b.hash OR z.area_m2 IS DISTINCT FROM b.area_m2""", String.class);

        assertThat(changed).isEqualTo("AV-0408,AV-0409,SEC-VERDE-02");
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
