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
 * SPEC-108 D-16, 15 nov 2026: la Sub-estación N-7 y el Desconocido_03 (prismas de OpenStreetMap) bajan a la mitad de
 * su alto, de 8 a 4 m. Nada más cambia.
 */
@Testcontainers
class HalfHeightPrismsMigrationTest {

    private static final String PREVIOUS_VERSION = "57";
    private static final String HALF_VERSION = "58";
    private static final String SUBESTACION_N7 = "249a8c11-620a-48d6-98aa-df74d1f90f69";
    private static final String DESCONOCIDO_03 = "3b943ec1-4267-425f-a701-b5822d06c6ce";

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
                SELECT id, plan_key, height_m, md5(ST_AsBinary(footprint)) AS hash FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(HALF_VERSION).migrate();
    }

    @Test
    void laSubestacionYElDesconocido03BajanALaMitad() {
        for (String key : new String[] {SUBESTACION_N7, DESCONOCIDO_03}) {
            Double ratio = db.queryForObject("""
                    SELECT b.height_m / f.height_m FROM campus_buildings b JOIN buildings_before f ON f.id = b.id
                    WHERE b.plan_key = ?""", Double.class, key);

            assertThat(ratio).isCloseTo(0.5, within(1e-9));
        }
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

    private static Flyway flyway(String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }
}
