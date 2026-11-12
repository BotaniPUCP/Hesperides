package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SPEC-108 §4: los edificios del campus se agrupan bajo los 133 principales del plano oficial sin borrar
 * ninguno. La base se migra hasta la versión anterior, se siembra un lugar, se copia lo que no debe
 * cambiar y se aplica la migración generada. Solo bases desechables.
 */
@Testcontainers
class PlanBuildingsMigrationTest {

    private static final String PREVIOUS_VERSION = "39";
    private static final String PLAN_VERSION = "40";
    /** Uno de los 13 edificios del mapa que agrupa Artes Escénicas (C51). */
    private static final String ARTES_ESCENICAS_REF = "way/294601873";
    /** Otro de los 13, sin nombre, alias ni lugares: se puede borrar sin tocar nada más. */
    private static final String UNNAMED_ARTES_ESCENICAS_REF = "way/1204040938";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate db;
    private static long placeId;
    private static long placeBuildingId;
    private static long libraryId;
    private static List<String> libraryAliases;
    private static long aliasesBefore;

    @BeforeAll
    static void migrate() {
        db = jdbc(postgres.getJdbcUrl());
        flyway(db, PREVIOUS_VERSION).migrate();

        // Copia de lo que la migración no debe cambiar, para comparar después.
        db.execute("""
                CREATE TABLE buildings_before AS
                SELECT id, source_ref, is_campus, footprint FROM campus_buildings""");
        placeBuildingId = db.queryForObject(
                "SELECT id FROM campus_buildings WHERE source_ref = ?", Long.class, ARTES_ESCENICAS_REF);
        placeId = db.queryForObject("""
                INSERT INTO places (name, kind_item_id, category_item_id, building_id)
                SELECT 'Sala de ensayo', k.id, c.id, ?
                  FROM catalog_items k JOIN catalog_types kt ON kt.id = k.catalog_type_id,
                       catalog_items c JOIN catalog_types ct ON ct.id = c.catalog_type_id
                 WHERE kt.code = 'PLACE_KIND' AND k.code = 'OUTDOOR'
                   AND ct.code = 'REFERENCE_CATEGORY' AND c.code = 'EDIFICIO'
                RETURNING id""", Long.class, placeBuildingId);
        db.update("INSERT INTO place_buildings (place_id, building_id) VALUES (?, ?)", placeId, placeBuildingId);
        libraryId = db.queryForObject("SELECT id FROM campus_buildings WHERE name = 'Biblioteca Central'", Long.class);
        libraryAliases = aliasesOf(libraryId);
        aliasesBefore = db.queryForObject("SELECT count(*) FROM campus_building_aliases", Long.class);

        flyway(db, PLAN_VERSION).migrate();
    }

    private static JdbcTemplate jdbc(String url) {
        return new JdbcTemplate(new DriverManagerDataSource(url, postgres.getUsername(), postgres.getPassword()));
    }

    private static Flyway flyway(JdbcTemplate target, String version) {
        return Flyway.configure().dataSource(target.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }

    private static List<String> aliasesOf(long buildingId) {
        return db.queryForList("SELECT alias FROM campus_building_aliases WHERE building_id = ? ORDER BY alias",
                String.class, buildingId);
    }

    private int count(String sql, Object... args) {
        return db.queryForObject(sql, Integer.class, args);
    }

    @Test
    void principalesYAgrupados() {
        assertThat(count("SELECT count(*) FROM campus_buildings WHERE parent_building_id IS NULL AND is_campus"))
                .isEqualTo(133);
        assertThat(count("SELECT count(*) FROM campus_buildings WHERE parent_building_id IS NOT NULL")).isEqualTo(71);
        assertThat(count("""
                SELECT count(*) FROM campus_buildings WHERE parent_building_id IS NULL AND is_campus
                   AND plan_key IS NOT NULL""")).isEqualTo(133);
        assertThat(count("""
                SELECT count(*) FROM campus_buildings b JOIN campus_buildings p ON p.id = b.parent_building_id
                 WHERE p.parent_building_id IS NULL AND p.plan_key IS NOT NULL""")).isEqualTo(71);
        assertThat(count("""
                SELECT count(*) FROM campus_building_codes c JOIN campus_buildings b ON b.id = c.building_id
                 WHERE b.parent_building_id IS NULL AND b.plan_key IS NOT NULL""")).isEqualTo(127);
    }

    @Test
    void conservaIdsAliasYLugares() {
        assertThat(count("""
                SELECT count(*) FROM buildings_before o JOIN campus_buildings b ON b.id = o.id
                 WHERE o.is_campus AND b.is_campus""")).isEqualTo(162);
        assertThat(db.queryForObject("SELECT count(*) FROM campus_building_aliases", Long.class))
                .isGreaterThanOrEqualTo(aliasesBefore);
        assertThat(db.queryForObject("""
                SELECT b.id FROM places p JOIN campus_buildings b ON b.id = p.building_id WHERE p.id = ?""",
                Long.class, placeId)).isEqualTo(placeBuildingId);
        assertThat(db.queryForList("SELECT building_id FROM place_buildings WHERE place_id = ?", Long.class, placeId))
                .containsExactly(placeBuildingId);
    }

    @Test
    void elEntornoNoCambia() {
        assertThat(count("SELECT count(*) FROM campus_buildings WHERE NOT is_campus")).isEqualTo(255);
        assertThat(count("""
                SELECT count(*) FROM buildings_before o JOIN campus_buildings b ON b.id = o.id
                 WHERE NOT o.is_campus AND NOT b.is_campus AND ST_Equals(o.footprint, b.footprint)
                   AND b.plan_key IS NULL AND b.parent_building_id IS NULL""")).isEqualTo(255);
    }

    @Test
    void sinPabellonC() {
        assertThat(count("SELECT count(*) FROM campus_building_codes WHERE code = '2'")).isZero();
    }

    @Test
    void bibliotecaConservaSuId() {
        var library = db.queryForMap(
                "SELECT plan_key, parent_building_id FROM campus_buildings WHERE id = ?", libraryId);

        assertThat(library.get("plan_key")).isNotNull();
        assertThat(library.get("parent_building_id")).isNull();
        assertThat(aliasesOf(libraryId)).isNotEmpty().containsExactlyElementsOf(libraryAliases);
    }

    @Test
    void artesEscenicasAgrupa13() {
        Long principal = db.queryForObject(
                "SELECT building_id FROM campus_building_codes WHERE code = 'C51'", Long.class);

        assertThat(count("SELECT count(*) FROM campus_buildings WHERE parent_building_id = ?", principal))
                .isEqualTo(13);
        assertThat(db.queryForObject("SELECT parent_building_id FROM campus_buildings WHERE id = ?", Long.class,
                placeBuildingId)).isEqualTo(principal);
    }

    @Test
    void categoriaDeLosGrupos() {
        // Los 3 edificios de McGregor son PABELLONES_Y_AULAS; los 13 de Artes Escénicas no coinciden.
        assertThat(db.queryForObject("""
                SELECT ci.code FROM campus_buildings b JOIN catalog_items ci ON ci.id = b.category_item_id
                 WHERE b.source_ref IS NULL AND b.name = 'McGregor'""", String.class)).isEqualTo("PABELLONES_Y_AULAS");
        assertThat(db.queryForObject("""
                SELECT b.category_item_id FROM campus_buildings b JOIN campus_building_codes c ON c.building_id = b.id
                 WHERE c.code = 'C51'""", Long.class)).isNull();
    }

    @Test
    void sourceRefIntacto() {
        assertThat(count("""
                SELECT count(*) FROM buildings_before o JOIN campus_buildings b ON b.id = o.id
                 WHERE b.plan_key IS NOT NULL AND b.source_ref = o.source_ref""")).isEqualTo(91);
        assertThat(count("""
                SELECT count(*) FROM buildings_before o JOIN campus_buildings b ON b.id = o.id
                 WHERE b.source_ref IS DISTINCT FROM o.source_ref""")).isZero();
    }

    @Test
    void unBorradoLogicoLiberaSuPlanKey() throws SQLException {
        // INV-4: la unicidad solo cuenta las filas vivas. Se prueba en una transacción
        // que se deshace, para no cambiar la base que leen los demás tests.
        String copy = """
                INSERT INTO campus_buildings (source, plan_key, name, is_campus, footprint)
                SELECT source, plan_key, name, is_campus, footprint FROM campus_buildings WHERE id = """ + libraryId;
        try (Connection c = db.getDataSource().getConnection(); Statement s = c.createStatement()) {
            c.setAutoCommit(false);
            try {
                s.execute("SAVEPOINT duplicate");
                assertThatThrownBy(() -> s.executeUpdate(copy)).hasMessageContaining("uq_campus_buildings_plan_key");
                s.execute("ROLLBACK TO SAVEPOINT duplicate");

                s.executeUpdate("UPDATE campus_buildings SET deleted_at = CURRENT_TIMESTAMP WHERE id = " + libraryId);
                assertThat(s.executeUpdate(copy)).isEqualTo(1);
            } finally {
                c.rollback();
            }
        }
    }

    @Test
    void abortaSiFaltaUnEdificio() {
        db.execute("CREATE DATABASE missing_building");
        JdbcTemplate other = jdbc("jdbc:postgresql://%s:%d/missing_building".formatted(
                postgres.getHost(), postgres.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT)));
        flyway(other, PREVIOUS_VERSION).migrate();
        other.update("DELETE FROM campus_buildings WHERE source_ref = ?", UNNAMED_ARTES_ESCENICAS_REF);

        // Lo detiene el DO final: quedan 70 agrupados de 71.
        assertThatThrownBy(() -> flyway(other, PLAN_VERSION).migrate())
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("se esperaban 133 principales, 71 agrupados y 127 códigos; "
                        + "hay 133 (133 con plan_key), 70 y 127");
        assertThat(other.queryForObject("""
                SELECT count(*) FROM information_schema.columns
                 WHERE table_name = 'campus_buildings' AND column_name = 'parent_building_id'""", Integer.class))
                .isZero();
    }
}
