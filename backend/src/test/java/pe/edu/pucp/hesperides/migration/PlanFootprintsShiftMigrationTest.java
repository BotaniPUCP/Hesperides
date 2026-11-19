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
 * SPEC-108, corrección del 14 nov 2026: el plano oficial quedó 2,6 m al este y 2,6 m al norte de los
 * jardines. Las huellas de lo que el visor dibuja con el modelo del plano (las del SKP, source = 'PUCP', y la
 * caseta del edificio 95) se corren lo mismo que el anclaje del manifiesto; las de OpenStreetMap no se tocan.
 */
@Testcontainers
class PlanFootprintsShiftMigrationTest {

    private static final String PREVIOUS_VERSION = "52";
    private static final String SHIFT_VERSION = "53";
    /** 2,6 m al oeste y 2,6 m al sur, en grados a la latitud del anclaje (WGS84), como el manifiesto. */
    private static final double D_LON = -0.000023880677126684355;
    private static final double D_LAT = -0.000023503283647569735;
    private static final double TOLERANCE_DEG = 1e-9;
    /** SPEC-108 D-04: su malla es la caseta C-3446 ajustada a su contorno de OpenStreetMap, y viaja en el GLB. */
    private static final String CASETA_95 = "b9a4a553-9c25-45f2-b2fc-43592ab2b917";

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
                CREATE TABLE footprints_before AS
                SELECT id, source, plan_key, ST_X(ST_Centroid(footprint)) AS x, ST_Y(ST_Centroid(footprint)) AS y,
                       ST_NPoints(footprint) AS points, ST_Area(footprint) AS area
                FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(SHIFT_VERSION).migrate();
    }

    @Test
    void lasHuellasDelPlanoSeCorrenAlOesteYAlSur() {
        Integer moved = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN footprints_before f ON f.id = b.id
                WHERE f.source = 'PUCP'
                  AND abs(ST_X(ST_Centroid(b.footprint)) - f.x - ?) < ?
                  AND abs(ST_Y(ST_Centroid(b.footprint)) - f.y - ?) < ?""",
                Integer.class, D_LON, TOLERANCE_DEG, D_LAT, TOLERANCE_DEG);
        Integer plan = db.queryForObject("SELECT count(*) FROM footprints_before WHERE source = 'PUCP'", Integer.class);

        assertThat(plan).isGreaterThan(100);
        assertThat(moved).isEqualTo(plan);
    }

    @Test
    void laCasetaDelEdificio95SeCorreConSuMalla() {
        // Su huella es de OpenStreetMap, pero el visor la dibuja con la malla del GLB, que se corrió con el anclaje.
        Integer moved = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN footprints_before f ON f.id = b.id
                WHERE f.plan_key = ?
                  AND abs(ST_X(ST_Centroid(b.footprint)) - f.x - ?) < ?
                  AND abs(ST_Y(ST_Centroid(b.footprint)) - f.y - ?) < ?""",
                Integer.class, CASETA_95, D_LON, TOLERANCE_DEG, D_LAT, TOLERANCE_DEG);

        assertThat(moved).isEqualTo(1);
    }

    @Test
    void lasDeOpenStreetMapNoSeMueven() {
        Integer osm = db.queryForObject("""
                SELECT count(*) FROM footprints_before WHERE source = 'OSM' AND plan_key IS DISTINCT FROM ?""", Integer.class, CASETA_95);
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN footprints_before f ON f.id = b.id
                WHERE f.source = 'OSM' AND f.plan_key IS DISTINCT FROM ?
                  AND (abs(ST_X(ST_Centroid(b.footprint)) - f.x) > ? OR abs(ST_Y(ST_Centroid(b.footprint)) - f.y) > ?)""",
                Integer.class, CASETA_95, TOLERANCE_DEG, TOLERANCE_DEG);

        assertThat(osm).isGreaterThan(300);
        assertThat(changed).isZero();
    }

    @Test
    void laFormaNoCambia() {
        Double worstAreaChange = db.queryForObject("""
                SELECT max(abs(ST_Area(b.footprint) - f.area) / f.area) FROM campus_buildings b
                JOIN footprints_before f ON f.id = b.id WHERE f.source = 'PUCP' OR f.plan_key = ?""", Double.class, CASETA_95);
        Integer pointsChanged = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN footprints_before f ON f.id = b.id
                WHERE ST_NPoints(b.footprint) <> f.points""", Integer.class);

        assertThat(worstAreaChange).isCloseTo(0.0, within(1e-6));
        assertThat(pointsChanged).isZero();
    }

    @Test
    void elMapaSabeQueSusDatosCambiaron() {
        assertThat(db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class))
                .isGreaterThan(versionBefore);
    }

    private static Flyway flyway(String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }
}
