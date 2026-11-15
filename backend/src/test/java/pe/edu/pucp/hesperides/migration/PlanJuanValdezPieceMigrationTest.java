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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * SPEC-108 D-18, 14 nov 2026: el mapa mostraba la Librería PUCP y el café Juan Valdez como un solo edificio. La
 * Librería se queda con el código 42 y la malla; el Juan Valdez de OpenStreetMap pasa a ser un principal con la pieza
 * que el manifiesto separa de esa malla, y su huella es la del café en el SKP. Nada más cambia.
 */
@Testcontainers
class PlanJuanValdezPieceMigrationTest {

    private static final String PREVIOUS_VERSION = "56";
    private static final String PIECE_VERSION = "57";
    private static final String LIBRERIA_PUCP = "4ee6b413-6f00-4a87-a25c-c7aa5b6cfcae";
    /** La pieza `pieces` del manifiesto: la caja del café y el muro de su jardinera. */
    private static final String JUAN_VALDEZ = "5c6e8c9f-26bb-4285-b29c-26b5edd25c35";
    private static final String JUAN_VALDEZ_OSM = "way/449759519";
    /** Lo que ocupa el café en planta, en el SKP. */
    private static final double CAFE_M2 = 39.12;
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
                SELECT id, name, plan_key, parent_building_id, footprint, height_m, base_m, md5(ST_AsBinary(footprint)) AS hash
                FROM campus_buildings WHERE deleted_at IS NULL""");
        flyway(PIECE_VERSION).migrate();
    }

    @Test
    void laLibreriaPucpLlevaElNombreDeSuCodigo42() {
        Map<String, Object> row = db.queryForMap("""
                SELECT b.name, bc.code FROM campus_buildings b JOIN campus_building_codes bc ON bc.building_id = b.id
                WHERE b.plan_key = ? AND bc.deleted_at IS NULL""", LIBRERIA_PUCP);

        assertThat(row).containsEntry("name", "Librería PUCP").containsEntry("code", "42");
    }

    @Test
    void laHuellaDeLaLibreriaPierdeSoloElCafe() {
        Double lost = db.queryForObject("""
                SELECT ST_Area(f.footprint::geography) - ST_Area(b.footprint::geography) FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", Double.class, LIBRERIA_PUCP);
        Double gained = db.queryForObject("""
                SELECT ST_Area(ST_Difference(b.footprint, f.footprint)::geography) FROM campus_buildings b
                JOIN buildings_before f ON f.id = b.id WHERE b.plan_key = ?""", Double.class, LIBRERIA_PUCP);

        assertThat(lost).isCloseTo(CAFE_M2, within(TOLERANCE_M2));
        assertThat(gained).isLessThanOrEqualTo(TOLERANCE_M2);
    }

    @Test
    void elJuanValdezEsUnPrincipalConLaPiezaDelManifiesto() {
        Map<String, Object> row = db.queryForMap("""
                SELECT name, plan_key, parent_building_id, height_m::float8 AS height_m FROM campus_buildings
                WHERE source_ref = ? AND deleted_at IS NULL""", JUAN_VALDEZ_OSM);

        assertThat(row).containsEntry("name", "Juan Valdez").containsEntry("plan_key", JUAN_VALDEZ).containsEntry("parent_building_id", null);
        assertThat((Double) row.get("height_m")).isCloseTo(3.85, within(0.01));
    }

    @Test
    void laHuellaDelJuanValdezEsLaQuePerdioLaLibreria() {
        Double mismatch = db.queryForObject("""
                SELECT ST_Area(ST_SymDifference(j.footprint, ST_Difference(f.footprint, l.footprint))::geography)
                FROM campus_buildings j, campus_buildings l JOIN buildings_before f ON f.id = l.id
                WHERE j.plan_key = ? AND l.plan_key = ?""", Double.class, JUAN_VALDEZ, LIBRERIA_PUCP);

        assertThat(mismatch).isLessThanOrEqualTo(TOLERANCE_M2);
    }

    @Test
    void losOtrosHijosDeOpenStreetMapSiguenEnLaLibreria() {
        List<String> children = db.queryForList("""
                SELECT b.source_ref FROM campus_buildings b JOIN campus_buildings l ON l.id = b.parent_building_id
                WHERE l.plan_key = ? AND b.deleted_at IS NULL ORDER BY b.source_ref""", String.class, LIBRERIA_PUCP);

        assertThat(children).containsExactly("way/387071629", "way/449759600");
    }

    @Test
    void nadaMasCambia() {
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN buildings_before f ON f.id = b.id
                WHERE md5(ST_AsBinary(b.footprint)) <> f.hash OR b.height_m IS DISTINCT FROM f.height_m
                   OR b.name IS DISTINCT FROM f.name OR b.plan_key IS DISTINCT FROM f.plan_key
                   OR b.parent_building_id IS DISTINCT FROM f.parent_building_id""", Integer.class);

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
