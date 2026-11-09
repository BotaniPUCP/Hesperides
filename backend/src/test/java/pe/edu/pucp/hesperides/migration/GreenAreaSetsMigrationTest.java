package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SPEC-203 §4: los conjuntos de áreas verdes y la conversión de las reglas por
 * sección y por sector. Solo bases desechables.
 */
@Testcontainers
class GreenAreaSetsMigrationTest {

    private static final String PREVIOUS_VERSION = "37";
    private static final String SETS_VERSION = "38";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate db;
    private static long sector;
    private static long section;
    private static String sectorName;
    private static Map<String, Long> activity;

    @BeforeAll
    static void migrate() {
        db = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        flyway(PREVIOUS_VERSION).migrate();
        seedRules();
        flyway(SETS_VERSION).migrate();
    }

    private static Flyway flyway(String target) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(target).cleanDisabled(true).load();
    }

    private static void seedRules() {
        sector = db.queryForObject("SELECT id FROM zones WHERE code = 'SEC-VERDE-02'", Long.class);
        sectorName = db.queryForObject("SELECT name FROM zones WHERE id = ?", String.class, sector);
        section = db.queryForObject("""
                SELECT id FROM zones WHERE parent_zone_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 1""",
                Long.class, sector);
        // Fuerza el choque de nombres: la sección se llama igual que su sector.
        db.update("UPDATE zones SET name = ? WHERE id = ?", sectorName, section);
        List<Long> types = db.queryForList("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.deleted_at IS NULL ORDER BY ci.id LIMIT 5""", Long.class);
        activity = Map.of("A", types.get(0), "B", types.get(1), "C", types.get(2), "D", types.get(3), "E", types.get(4));

        rule("A", "IN_HOUSE", "BY_ZONE", section, "DATE '2026-01-01'", "NULL", "NULL");
        rule("A", "IN_HOUSE", "BY_ZONE", section, "DATE '2025-01-01'", "DATE '2025-12-31'", "NULL");
        rule("B", "IN_HOUSE", "BY_ZONE", section, "DATE '2026-01-01'", "NULL", "NULL");
        rule("B", "OUTSOURCED", "BY_ZONE", section, "DATE '2026-01-01'", "NULL", "CURRENT_TIMESTAMP");
        rule("D", "IN_HOUSE", "BY_SECTOR", sector, "DATE '2026-01-01'", "NULL", "NULL");
        rule("C", "IN_HOUSE", "BY_SECTOR", null, "DATE '2026-01-01'", "NULL", "NULL");
        rule("A", "IN_HOUSE", "CAMPUS_WIDE", null, "DATE '2026-01-01'", "NULL", "NULL");
        rule("A", "IN_HOUSE", "BY_SECTOR", null, "DATE '2026-01-01'", "NULL", "NULL");
        // Casos que la API no produce pero una base puede tener: no deben abortar la migración.
        rule("E", "IN_HOUSE", "CAMPUS_WIDE", null, "DATE '2026-01-01'", "NULL", "NULL");
        rule("E", "IN_HOUSE", "BY_SECTOR", null, "DATE '2099-01-01'", "NULL", "NULL");
        rule("E", "OUTSOURCED", "BY_ZONE", 999_999_999L, "DATE '2026-01-01'", "NULL", "NULL");
    }

    private static void rule(String act, String regime, String scope, Long zone,
                             String validFrom, String validTo, String deletedAt) {
        db.update("""
                INSERT INTO maintenance_frequencies (activity_type_item_id, frequency_rule_type_item_id, regime,
                    scope, zone_id, target_days_interval, min_days_interval, max_days_interval,
                    valid_from, valid_to, deleted_at, notes)
                SELECT ?, ci.id, ?, ?, ?, 21, 30, 35, %s, %s, %s, ?
                FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'FREQUENCY_RULE_TYPE' AND ci.code = 'INTERVAL_DAYS'
                """.formatted(validFrom, validTo, deletedAt),
                activity.get(act), regime, scope, zone, act + "-" + regime + "-" + scope + "-" + validFrom);
    }

    private List<Map<String, Object>> rulesOf(String act) {
        return db.queryForList("""
                SELECT scope, green_area_set_id, valid_to, deleted_at FROM maintenance_frequencies
                WHERE activity_type_item_id = ? ORDER BY id""", activity.get(act));
    }

    private Long setNamed(String name) {
        return db.queryForObject("SELECT id FROM green_area_sets WHERE name = ? AND deleted_at IS NULL",
                Long.class, name);
    }

    @Test
    void bySectionRulesShareOneSetWithEveryActivityAndKeepTheirHistory() {
        Long set = setNamed(sectorName);
        assertThat(db.queryForList("SELECT zone_id FROM green_area_set_zones WHERE set_id = ?", Long.class, set))
                .containsExactly(section);
        assertThat(db.queryForList("""
                SELECT activity_type_item_id FROM green_area_set_activities WHERE set_id = ? ORDER BY 1""",
                Long.class, set)).containsExactlyInAnyOrder(activity.get("A"), activity.get("B"));
        assertThat(rulesOf("B")).allSatisfy(r -> {
            assertThat(r.get("scope")).isEqualTo("BY_SET");
            assertThat(r.get("green_area_set_id")).isEqualTo(set);
        });
        assertThat(rulesOf("A").subList(0, 2)).allSatisfy(r -> assertThat(r.get("green_area_set_id")).isEqualTo(set));
        assertThat(db.queryForObject("SELECT created_by_user_id FROM green_area_sets WHERE id = ?", Long.class, set))
                .isNull();
    }

    @Test
    void aSectorRuleBecomesASetWithItsActiveSectionsAndAvoidsTheTakenName() {
        Long set = setNamed(sectorName + " (sector)");
        int sections = db.queryForObject("""
                SELECT count(*) FROM zones WHERE parent_zone_id = ? AND deleted_at IS NULL""", Integer.class, sector);
        assertThat(db.queryForObject("SELECT count(*) FROM green_area_set_zones WHERE set_id = ?", Integer.class, set))
                .isEqualTo(sections);
        assertThat(rulesOf("D")).singleElement().satisfies(r -> {
            assertThat(r.get("scope")).isEqualTo("BY_SET");
            assertThat(r.get("green_area_set_id")).isEqualTo(set);
        });
    }

    @Test
    void aSectorRuleWithoutSectorBecomesCampusWideOrClosesWhenItCollides() {
        assertThat(rulesOf("C")).singleElement().satisfies(r -> {
            assertThat(r.get("scope")).isEqualTo("CAMPUS_WIDE");
            assertThat(r.get("valid_to")).isNull();
        });
        var collided = rulesOf("A").get(3);
        assertThat(collided.get("scope")).isEqualTo("CAMPUS_WIDE");
        assertThat(collided.get("valid_to")).isNotNull();
        assertThat(rulesOf("A").get(2).get("valid_to")).isNull();
    }

    @Test
    void aFutureCollidingSectorRuleAndAnOrphanZoneRuleAreRetiredInsteadOfAborting() {
        var rows = rulesOf("E");
        assertThat(rows.get(0).get("deleted_at")).isNull();
        assertThat(rows.get(1).get("scope")).isEqualTo("CAMPUS_WIDE");
        assertThat(rows.get(1).get("deleted_at")).isNotNull();
        assertThat(rows.get(2).get("scope")).isEqualTo("CAMPUS_WIDE");
        assertThat(rows.get(2).get("deleted_at")).isNotNull();
    }

    @Test
    void noOldScopeNorDroppedColumnRemains() {
        assertThat(db.queryForObject("""
                SELECT count(*) FROM maintenance_frequencies WHERE scope IN ('BY_ZONE','BY_SECTOR')""", Integer.class))
                .isZero();
        assertThat(db.queryForList("""
                SELECT table_name || '.' || column_name FROM information_schema.columns
                WHERE table_name IN ('maintenance_frequencies','maintenance_frequency_seasons')
                AND column_name IN ('zone_id','target_days_interval')""", String.class)).isEmpty();
    }

    @Test
    void aSetRuleNeedsItsSetAndSetNamesAreUniqueIgnoringCase() {
        assertThatThrownBy(() -> db.update("""
                UPDATE maintenance_frequencies SET green_area_set_id = NULL WHERE scope = 'BY_SET'"""))
                .isInstanceOf(DataIntegrityViolationException.class);
        db.update("INSERT INTO green_area_sets (name) VALUES ('Prueba')");
        assertThatThrownBy(() -> db.update("INSERT INTO green_area_sets (name) VALUES ('prueba')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
