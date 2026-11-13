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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SPEC-203 §4 (V048): las actividades de cada conjunto y las frecuencias propias
 * pasan a ser asignaciones, sin perder ninguna fila de planificación. Solo bases desechables.
 */
@Testcontainers
class PlanningAssignmentsMigrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate db;
    private static long set;
    private static long otherSet;
    private static List<Long> types;

    @BeforeAll
    static void migrate() {
        db = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        flyway("47").migrate();
        seed();
        flyway("48").migrate();
    }

    private static Flyway flyway(String target) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(target).cleanDisabled(true).load();
    }

    private static void seed() {
        types = db.queryForList("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.deleted_at IS NULL ORDER BY ci.id LIMIT 4""", Long.class);
        long section = db.queryForObject("""
                SELECT z.id FROM zones z JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = 'SECTION'
                WHERE z.deleted_at IS NULL ORDER BY z.id LIMIT 1""", Long.class);
        set = db.queryForObject("INSERT INTO green_area_sets(name) VALUES ('Con actividades') RETURNING id", Long.class);
        otherSet = db.queryForObject("INSERT INTO green_area_sets(name) VALUES ('Solo propia') RETURNING id", Long.class);
        db.update("INSERT INTO green_area_set_zones(set_id, zone_id) VALUES (?,?),(?,?)", set, section, otherSet, section);
        // A: de todo el campus. B: propia del conjunto. C: sin regla. D: propia de otro conjunto, sin declararla.
        for (int i = 0; i < 3; i++) {
            db.update("INSERT INTO green_area_set_activities(set_id, activity_type_item_id) VALUES (?,?)", set, types.get(i));
        }
        rule(types.get(0), "CAMPUS_WIDE", null, "DATE '2025-01-01'", "DATE '2025-12-31'");
        rule(types.get(0), "CAMPUS_WIDE", null, "DATE '2026-01-01'", "NULL");
        rule(types.get(1), "CAMPUS_WIDE", null, "DATE '2026-01-01'", "NULL");
        rule(types.get(1), "BY_SET", set, "DATE '2026-01-01'", "NULL");
        rule(types.get(3), "BY_SET", otherSet, "DATE '2026-01-01'", "NULL");
    }

    private static void rule(long activity, String scope, Long setId, String from, String to) {
        db.update("""
                INSERT INTO maintenance_frequencies (activity_type_item_id, frequency_rule_type_item_id, regime, scope,
                    green_area_set_id, min_days_interval, max_days_interval, valid_from, valid_to)
                SELECT ?, ci.id, 'IN_HOUSE', ?, ?, 30, 35, %s, %s
                FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'FREQUENCY_RULE_TYPE' AND ci.code = 'INTERVAL_DAYS'""".formatted(from, to),
                activity, scope, setId);
    }

    private UUID currentRule(long activity, String scope) {
        return db.queryForObject("""
                SELECT rule_key FROM maintenance_frequencies WHERE activity_type_item_id = ? AND scope = ?
                  AND valid_to IS NULL AND deleted_at IS NULL""", UUID.class, activity, scope);
    }

    /** La regla que antes de V048 era propia del conjunto. */
    private UUID ownRuleOf(long setId, long activity) {
        return db.queryForObject("""
                SELECT rule_key FROM maintenance_frequencies WHERE activity_type_item_id = ? AND green_area_set_id = ?
                  AND valid_to IS NULL AND deleted_at IS NULL""", UUID.class, activity, setId);
    }

    private UUID assignedRule(long setId, long activity) {
        return db.queryForObject("""
                SELECT frequency_rule_key FROM planning_assignments WHERE set_id = ? AND activity_type_item_id = ?
                  AND deleted_at IS NULL""", UUID.class, setId, activity);
    }

    @Test
    void theVersionsOfARuleShareItsKey() {
        assertThat(db.queryForObject("""
                SELECT count(DISTINCT rule_key) FROM maintenance_frequencies WHERE activity_type_item_id = ?
                  AND scope = 'CAMPUS_WIDE'""", Integer.class, types.get(0))).isEqualTo(1);
    }

    @Test
    void aDeclaredActivityIsAssignedToTheGeneralRule() {
        assertThat(assignedRule(set, types.get(0))).isEqualTo(currentRule(types.get(0), "CAMPUS_WIDE"));
    }

    @Test
    void theSetsOwnRuleWinsOverTheGeneralOne() {
        assertThat(assignedRule(set, types.get(1))).isEqualTo(ownRuleOf(set, types.get(1)));
    }

    @Test
    void aDeclaredActivityWithoutRuleKeepsItsRowWithoutFrequency() {
        assertThat(assignedRule(set, types.get(2))).isNull();
    }

    @Test
    void anOwnRuleOfASetAlsoBecomesItsAssignment() {
        assertThat(assignedRule(otherSet, types.get(3))).isEqualTo(ownRuleOf(otherSet, types.get(3)));
    }

    @Test
    void aRuleForSetsNoLongerNeedsASetAndSeveralCanCoexist() {
        rule(types.get(3), "BY_SET", null, "DATE '2026-02-01'", "NULL");
        rule(types.get(3), "BY_SET", null, "DATE '2026-03-01'", "NULL");

        assertThat(db.queryForObject("""
                SELECT count(*) FROM maintenance_frequencies WHERE activity_type_item_id = ? AND scope = 'BY_SET'
                  AND valid_to IS NULL""", Integer.class, types.get(3))).isEqualTo(3);
    }

    @Test
    void stillOnlyOneCurrentGeneralRulePerActivityAndRegime() {
        assertThatThrownBy(() -> rule(types.get(0), "CAMPUS_WIDE", null, "DATE '2026-05-01'", "NULL"))
                .hasMessageContaining("idx_maint_freq_unique_campus");
    }

    @Test
    void aSetHasOneAssignmentPerActivity() {
        assertThatThrownBy(() -> db.update(
                "INSERT INTO planning_assignments(set_id, activity_type_item_id) VALUES (?, ?)", set, types.get(0)))
                .hasMessageContaining("idx_planning_assignments_active");
    }
}
