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
 * SPEC-108 D-17, 14 nov 2026: la «U» de la esquina noreste del Comedor Central es una escalera que solo toca el suelo
 * al arrancar. Deja de ser parte de la huella del comedor y el pasto que tapaba queda libre. Nada más cambia.
 */
@Testcontainers
class PlanComedorStairMigrationTest {

    private static final String PREVIOUS_VERSION = "55";
    private static final String STAIR_VERSION = "56";
    private static final String COMEDOR_CENTRAL = "df5f87ed-a1f7-4fa6-ae35-b7f423f61806";
    /** Lo que ocupa la «U» en planta: los dos tramos y el descanso. */
    private static final double STAIR_M2 = 25.46;
    /** El pasto que la «U» tapaba. */
    private static final double GRASS_UNDER_STAIR_M2 = 23.06;
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
                SELECT id, plan_key, footprint, height_m, md5(ST_AsBinary(footprint)) AS hash FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(STAIR_VERSION).migrate();
    }

    @Test
    void laHuellaDelComedorPierdeSoloLaEscalera() {
        Double lost = db.queryForObject("""
                SELECT ST_Area(f.footprint::geography) - ST_Area(b.footprint::geography) FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", Double.class, COMEDOR_CENTRAL);
        Double gained = db.queryForObject("""
                SELECT ST_Area(ST_Difference(b.footprint, f.footprint)::geography) FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", Double.class, COMEDOR_CENTRAL);

        assertThat(lost).isCloseTo(STAIR_M2, within(TOLERANCE_M2));
        assertThat(gained).isLessThanOrEqualTo(TOLERANCE_M2);
    }

    @Test
    void elPastoQueTapabaLaEscaleraQuedaLibre() {
        assertThat(grassUnder("buildings_before") - grassUnder("campus_buildings")).isCloseTo(GRASS_UNDER_STAIR_M2, within(TOLERANCE_M2));
    }

    @Test
    void nadaMasCambia() {
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN buildings_before f ON f.id = b.id
                WHERE md5(ST_AsBinary(b.footprint)) <> f.hash OR b.height_m IS DISTINCT FROM f.height_m""", Integer.class);

        assertThat(changed).isEqualTo(1);
    }

    @Test
    void elMapaSabeQueSusDatosCambiaron() {
        assertThat(db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class)).isGreaterThan(versionBefore);
    }

    private static double grassUnder(String table) {
        return db.queryForObject("""
                SELECT coalesce(ST_Area(ST_Intersection(b.footprint, (SELECT ST_Union(z.boundary) FROM zones z
                    JOIN catalog_items ci ON ci.id = z.zone_type_item_id
                    WHERE z.deleted_at IS NULL AND ci.code = 'SECTION' AND ST_Intersects(z.boundary, b.footprint)))::geography), 0)
                FROM %s b WHERE b.plan_key = ?""".formatted(table), Double.class, COMEDOR_CENTRAL);
    }

    private static Flyway flyway(String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }
}
