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
 * SPEC-102 §4.3, enmienda del 15 nov 2026: ocho jardines repetían el polígono de un área xerofítica. Las
 * xerofíticas se quedan y heredan de su jardín el uso, el riego, el proyecto de riego, el sector, el código del
 * mapa y la reserva; los jardines se borran lógicamente. XE-0007, que cae dentro de XE-0005, también se va.
 */
@Testcontainers
class XerophyticAreasReplaceTheirGardensMigrationTest {

    private static final String PREVIOUS_VERSION = "65";
    private static final String REPLACE_VERSION = "66";
    /** Cada xerofítica que se queda, con el jardín del que hereda. */
    private static final Map<String, String> HEIRS = Map.of(
            "XE-0001", "AV-0248", "XE-0002", "AV-0253", "XE-0003", "AV-0264", "XE-0004", "AV-0287",
            "XE-0005", "AV-0383", "XE-0008", "AV-0466", "XE-0009", "AV-0483");
    private static final List<String> GONE = List.of(
            "AV-0248", "AV-0253", "AV-0264", "AV-0287", "AV-0383", "AV-0455", "AV-0466", "AV-0483", "XE-0007");
    private static final String SET_NAME = "Conjunto de prueba de xerofíticas";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate db;
    private static long versionBefore;
    private static long setVersionBefore;

    @BeforeAll
    static void migrate() {
        db = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        flyway(PREVIOUS_VERSION).migrate();
        versionBefore = db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class);
        db.execute("""
                CREATE TABLE zones_before AS
                SELECT id, code, name, description, map_code, parent_zone_id, use_type_item_id, irrigation_current_item_id,
                       irrigation_project_item_id, landscape_type_item_id, is_reservable, reservation_owner_item_id,
                       area_m2, md5(ST_AsBinary(boundary)) AS hash
                  FROM zones WHERE deleted_at IS NULL""");
        seedSet();
        setVersionBefore = db.queryForObject("SELECT version FROM green_area_sets WHERE name = ?", Long.class, SET_NAME);
        flyway(REPLACE_VERSION).migrate();
    }

    /** Un conjunto con dos jardines que se van a la misma xerofítica, otro que se va a la suya y uno que se queda. */
    private static void seedSet() {
        db.update("INSERT INTO green_area_sets (name) VALUES (?)", SET_NAME);
        db.update("""
                INSERT INTO green_area_set_zones (set_id, zone_id)
                SELECT s.id, z.id FROM green_area_sets s, zones z
                 WHERE s.name = ? AND z.code IN ('AV-0383', 'AV-0455', 'AV-0466', 'AV-0001') AND z.deleted_at IS NULL""", SET_NAME);
    }

    private static Map<String, Object> zone(String table, String code) {
        String alive = table.equals("zones") ? " AND deleted_at IS NULL" : "";
        return db.queryForMap("SELECT * FROM " + table + " WHERE code = ?" + alive, code);
    }

    @Test
    void cadaXerofiticaHeredaDeSuJardin() {
        HEIRS.forEach((xe, av) -> {
            Map<String, Object> after = zone("zones", xe), garden = zone("zones_before", av);
            for (String field : List.of("use_type_item_id", "irrigation_current_item_id", "irrigation_project_item_id",
                    "parent_zone_id", "map_code", "is_reservable", "reservation_owner_item_id")) {
                assertThat(after.get(field)).as("%s.%s", xe, field).isEqualTo(garden.get(field));
            }
        });
    }

    @Test
    void lasXerofiticasYaNoQuedanSinUsoNiSector() {
        HEIRS.keySet().forEach((xe) -> {
            Map<String, Object> after = zone("zones", xe);
            assertThat(after.get("use_type_item_id")).as(xe).isNotNull();
            assertThat(after.get("irrigation_project_item_id")).as(xe).isNotNull();
            assertThat(after.get("parent_zone_id")).as(xe).isNotNull();
        });
        assertThat(zone("zones", "XE-0005").get("map_code")).isEqualTo("E 31");
        assertThat(zone("zones", "XE-0002").get("map_code")).isEqualTo("D 14");
    }

    @Test
    void lasXerofiticasConservanLoSuyo() {
        HEIRS.keySet().forEach((xe) -> {
            Map<String, Object> before = zone("zones_before", xe), after = zone("zones", xe);
            for (String field : List.of("id", "name", "description", "landscape_type_item_id", "area_m2")) {
                assertThat(after.get(field)).as("%s.%s", xe, field).isEqualTo(before.get(field));
            }
        });
    }

    @Test
    void losJardinesRepetidosYXe0007SeBorranLogicamente() {
        GONE.forEach((code) -> {
            Long left = db.queryForObject("SELECT count(*) FROM zones WHERE code = ? AND deleted_at IS NOT NULL", Long.class, code);
            Long alive = db.queryForObject("SELECT count(*) FROM zones WHERE code = ? AND deleted_at IS NULL", Long.class, code);
            assertThat(left).as(code).isEqualTo(1);
            assertThat(alive).as(code).isZero();
        });
    }

    @Test
    void ningunaXerofiticaRepiteUnJardinNiCaeDentroDeOtra() {
        Long repeated = db.queryForObject("""
                SELECT count(*) FROM zones x JOIN catalog_items lx ON lx.id = x.landscape_type_item_id AND lx.code = 'XEROPHYTIC'
                  JOIN zones o ON o.id <> x.id AND o.deleted_at IS NULL AND o.landscape_type_item_id IS NOT NULL
                 WHERE x.deleted_at IS NULL AND ST_Intersects(x.boundary, o.boundary)
                   AND ST_Area(ST_SymDifference(x.boundary, o.boundary)::geography) < 0.01""", Long.class);
        Long nested = db.queryForObject("""
                SELECT count(*) FROM zones x JOIN catalog_items lx ON lx.id = x.landscape_type_item_id AND lx.code = 'XEROPHYTIC'
                  JOIN zones y ON y.id <> x.id AND y.landscape_type_item_id = x.landscape_type_item_id AND y.deleted_at IS NULL
                 WHERE x.deleted_at IS NULL AND ST_Intersects(x.boundary, y.boundary)
                   AND ST_Area(ST_Difference(y.boundary, x.boundary)::geography) < 0.01""", Long.class);

        assertThat(repeated).isZero();
        assertThat(nested).isZero();
    }

    @Test
    void elConjuntoCambiaLosJardinesPorSusXerofiticasUnaSolaVez() {
        List<String> codes = db.queryForList("""
                SELECT z.code FROM green_area_set_zones gz JOIN green_area_sets s ON s.id = gz.set_id JOIN zones z ON z.id = gz.zone_id
                 WHERE s.name = ? AND gz.deleted_at IS NULL ORDER BY z.code""", String.class, SET_NAME);
        Long oldLinks = db.queryForObject("""
                SELECT count(*) FROM green_area_set_zones gz JOIN green_area_sets s ON s.id = gz.set_id JOIN zones z ON z.id = gz.zone_id
                 WHERE s.name = ? AND gz.deleted_at IS NOT NULL""", Long.class, SET_NAME);

        assertThat(codes).containsExactly("AV-0001", "XE-0005", "XE-0008");
        assertThat(oldLinks).isEqualTo(3);
        assertThat(db.queryForObject("SELECT version FROM green_area_sets WHERE name = ?", Long.class, SET_NAME)).isGreaterThan(setVersionBefore);
    }

    @Test
    void losSectoresSonLaSumaDeSusSecciones() {
        for (String sector : List.of("SEC-VERDE-02", "SEC-VERDE-03")) {
            Double off = db.queryForObject("""
                    SELECT abs(s.area_m2 - (SELECT sum(c.area_m2) FROM zones c WHERE c.parent_zone_id = s.id AND c.deleted_at IS NULL))
                      FROM zones s WHERE s.code = ? AND s.deleted_at IS NULL""", Double.class, sector);
            assertThat(off).as(sector).isLessThan(0.01);
        }
    }

    @Test
    void elSector02DejaDeContarDosVecesAAv0455() {
        double sector = ((Number) zone("zones", "SEC-VERDE-02").get("area_m2")).doubleValue();
        double before = ((Number) zone("zones_before", "SEC-VERDE-02").get("area_m2")).doubleValue();
        double av0455 = ((Number) zone("zones_before", "AV-0455").get("area_m2")).doubleValue();

        assertThat(before - sector).isCloseTo(av0455, within(0.01));
    }

    @Test
    void elContornoDeLosSectoresSigueSiendoLaUnionDeSusSecciones() {
        for (String sector : List.of("SEC-VERDE-02", "SEC-VERDE-03")) {
            Double off = db.queryForObject("""
                    SELECT abs(ST_Area(s.boundary::geography) - ST_Area(ST_Union(c.boundary)::geography))
                      FROM zones s JOIN zones c ON c.parent_zone_id = s.id AND c.deleted_at IS NULL
                     WHERE s.code = ? AND s.deleted_at IS NULL GROUP BY s.id, s.boundary""", Double.class, sector);
            assertThat(off).as(sector).isLessThan(0.5);
        }
    }

    @Test
    void nadaMasCambia() {
        String changed = db.queryForObject("""
                SELECT string_agg(z.code, ',' ORDER BY z.code) FROM zones z JOIN zones_before b ON b.id = z.id
                 WHERE z.deleted_at IS NOT NULL OR md5(ST_AsBinary(z.boundary)) <> b.hash OR z.area_m2 IS DISTINCT FROM b.area_m2
                    OR z.parent_zone_id IS DISTINCT FROM b.parent_zone_id OR z.use_type_item_id IS DISTINCT FROM b.use_type_item_id
                    OR z.irrigation_project_item_id IS DISTINCT FROM b.irrigation_project_item_id
                    OR z.map_code IS DISTINCT FROM b.map_code""", String.class);

        assertThat(changed).isEqualTo(String.join(",",
                "AV-0248", "AV-0253", "AV-0264", "AV-0287", "AV-0383", "AV-0455", "AV-0466", "AV-0483",
                "SEC-VERDE-02", "XE-0001", "XE-0002", "XE-0003", "XE-0004", "XE-0005", "XE-0007", "XE-0008", "XE-0009"));
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
