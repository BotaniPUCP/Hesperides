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
 * SPEC-108 D-16, segunda tanda del 14 nov 2026: Desconocido_05 se corre al centro del hueco de su pasto y la casa
 * autosostenible baja a la mitad de su altura. Nada más cambia.
 */
@Testcontainers
class PlanBuildingsSecondFitMigrationTest {

    private static final String PREVIOUS_VERSION = "54";
    private static final String SECOND_FIT_VERSION = "55";
    private static final String DESCONOCIDO_05 = "16717028-8cbc-4d0f-a3cd-81599caa6223";
    private static final String CASA = "3bd329ba-5612-4e0d-bfd3-2a3142bf81a8";
    private static final double MAX_M2 = 0.1;
    private static final double HEIGHT_TOLERANCE_M = 0.005;

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
        flyway(SECOND_FIT_VERSION).migrate();
    }

    @Test
    void desconocido05DejaDePisarPasto() {
        assertThat(grassUnder("buildings_before", DESCONOCIDO_05)).isGreaterThan(1);
        assertThat(grassUnder("campus_buildings", DESCONOCIDO_05)).isLessThanOrEqualTo(MAX_M2);
    }

    @Test
    void desconocido05NoPisaOtroEdificioNiUnEstacionamiento() {
        Double onBuildings = db.queryForObject("""
                SELECT coalesce(sum(ST_Area(ST_Intersection(b.footprint, o.footprint)::geography)), 0) FROM campus_buildings b
                JOIN campus_buildings o ON o.id <> b.id AND o.deleted_at IS NULL AND o.parent_building_id IS NULL
                 AND ST_Intersects(b.footprint, o.footprint)
                WHERE b.plan_key = ? AND b.deleted_at IS NULL""", Double.class, DESCONOCIDO_05);
        Double onParking = db.queryForObject("""
                SELECT coalesce(sum(ST_Area(ST_Intersection(b.footprint, f.geom)::geography)), 0) FROM campus_buildings b
                JOIN campus_features f ON f.deleted_at IS NULL AND ST_Intersects(b.footprint, f.geom)
                JOIN catalog_items ci ON ci.id = f.feature_type_item_id AND ci.code = 'PARKING'
                WHERE b.plan_key = ? AND b.deleted_at IS NULL""", Double.class, DESCONOCIDO_05);

        assertThat(onBuildings).isLessThanOrEqualTo(MAX_M2);
        assertThat(onParking).isLessThanOrEqualTo(MAX_M2);
    }

    @Test
    void laCasaQuedaALaMitadDeSuAltura() {
        Double before = db.queryForObject("SELECT height_m FROM buildings_before WHERE plan_key = ?", Double.class, CASA);
        Double after = db.queryForObject("SELECT height_m FROM campus_buildings WHERE plan_key = ? AND deleted_at IS NULL", Double.class, CASA);

        assertThat(after).isCloseTo(before / 2, within(HEIGHT_TOLERANCE_M));
    }

    @Test
    void nadaMasCambia() {
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN buildings_before f ON f.id = b.id
                WHERE md5(ST_AsBinary(b.footprint)) <> f.hash OR b.height_m IS DISTINCT FROM f.height_m""", Integer.class);

        assertThat(changed).isEqualTo(2);
    }

    @Test
    void elMapaSabeQueSusDatosCambiaron() {
        assertThat(db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class)).isGreaterThan(versionBefore);
    }

    private static double grassUnder(String table, String planKey) {
        return db.queryForObject("""
                SELECT coalesce(ST_Area(ST_Intersection(b.footprint, (SELECT ST_Union(z.boundary) FROM zones z
                    JOIN catalog_items ci ON ci.id = z.zone_type_item_id
                    WHERE z.deleted_at IS NULL AND ci.code = 'SECTION' AND ST_Intersects(z.boundary, b.footprint)))::geography), 0)
                FROM %s b WHERE b.plan_key = ?""".formatted(table), Double.class, planKey);
    }

    private static Flyway flyway(String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }
}
