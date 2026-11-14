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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SPEC-108 D-16, pedido de Jean Piero del 14 nov 2026: cinco edificios encajan con el pasto vistos desde arriba.
 * Después de V054 ninguno pisa una sección y ningún otro edificio cambia.
 */
@Testcontainers
class PlanBuildingsFitMigrationTest {

    private static final String PREVIOUS_VERSION = "53";
    private static final String FIT_VERSION = "54";
    /** N-7, Desconocido_07, Desconocido_08, la casa autosostenible y el invernadero inteligente. */
    private static final List<String> FITTED = List.of(
            "249a8c11-620a-48d6-98aa-df74d1f90f69", "e82375f3-02dc-461a-98ea-67b4a9244f12", "9d9846b2-72fd-420b-8dad-6b03f84fc8ef",
            "3bd329ba-5612-4e0d-bfd3-2a3142bf81a8", "323a6e7d-0804-48dc-84f7-5cf7f4b664c4");
    /** Lo que queda por redondeo y por el borde dibujado a mano: menos que una baldosa. */
    private static final double MAX_GRASS_M2 = 0.1;
    private static final double MIN_GRASS_BEFORE_M2 = 3;

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
                SELECT id, plan_key, footprint, md5(ST_AsBinary(footprint)) AS hash FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(FIT_VERSION).migrate();
    }

    @Test
    void antesCadaUnoPisabaPasto() {
        FITTED.forEach((key) -> assertThat(grassUnder("footprints_before", key)).as(key).isGreaterThan(MIN_GRASS_BEFORE_M2 / 4));
    }

    @Test
    void despuesNingunoPisaPasto() {
        FITTED.forEach((key) -> assertThat(grassUnder("campus_buildings", key)).as(key).isLessThanOrEqualTo(MAX_GRASS_M2));
    }

    @Test
    void ningunoPisaOtroEdificioNiUnEstacionamiento() {
        // Encajar con el pasto no puede llevarlos encima de un vecino (ya en su lugar final) ni de un estacionamiento.
        FITTED.forEach((key) -> {
            Double onBuildings = db.queryForObject("""
                    SELECT coalesce(sum(ST_Area(ST_Intersection(b.footprint, o.footprint)::geography)), 0) FROM campus_buildings b
                    JOIN campus_buildings o ON o.id <> b.id AND o.deleted_at IS NULL AND o.parent_building_id IS NULL
                     AND ST_Intersects(b.footprint, o.footprint)
                    WHERE b.plan_key = ? AND b.deleted_at IS NULL""", Double.class, key);
            Double onParking = db.queryForObject("""
                    SELECT coalesce(sum(ST_Area(ST_Intersection(b.footprint, f.geom)::geography)), 0) FROM campus_buildings b
                    JOIN campus_features f ON f.deleted_at IS NULL AND ST_Intersects(b.footprint, f.geom)
                    JOIN catalog_items ci ON ci.id = f.feature_type_item_id AND ci.code = 'PARKING'
                    WHERE b.plan_key = ? AND b.deleted_at IS NULL""", Double.class, key);

            assertThat(onBuildings).as("edificios bajo " + key).isLessThanOrEqualTo(MAX_GRASS_M2);
            assertThat(onParking).as("estacionamientos bajo " + key).isLessThanOrEqualTo(MAX_GRASS_M2);
        });
    }

    @Test
    void ningunOtroEdificioCambia() {
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN footprints_before f ON f.id = b.id
                WHERE md5(ST_AsBinary(b.footprint)) <> f.hash""", Integer.class);

        assertThat(changed).isEqualTo(FITTED.size());
    }

    @Test
    void elMapaSabeQueSusDatosCambiaron() {
        assertThat(db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class)).isGreaterThan(versionBefore);
    }

    /** Metros cuadrados de secciones (pasto) bajo la huella del edificio en esa tabla. */
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
