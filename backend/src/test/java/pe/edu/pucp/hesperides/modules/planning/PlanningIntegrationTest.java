package pe.edu.pucp.hesperides.modules.planning;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-203 §3.2 contra una base real: qué reglas planifican y qué jardines cuentan. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class PlanningIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private long set;
    private List<Long> types;
    private long kept;

    @BeforeEach
    void data() {
        types = jdbc.queryForList("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.deleted_at IS NULL ORDER BY ci.id DESC LIMIT 3""", Long.class);
        jdbc.update("UPDATE maintenance_frequencies SET deleted_at = CURRENT_TIMESTAMP WHERE activity_type_item_id IN (?,?,?)",
                types.get(0), types.get(1), types.get(2));
        long sectionType = jdbc.queryForObject("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION'""", Long.class);
        kept = zone(sectionType);
        long removed = zone(sectionType);
        set = jdbc.queryForObject("INSERT INTO green_area_sets(name) VALUES (?) RETURNING id", Long.class,
                "Planificación " + UUID.randomUUID());
        jdbc.update("INSERT INTO green_area_set_zones(set_id, zone_id) VALUES (?,?),(?,?)", set, kept, set, removed);
        jdbc.update("UPDATE zones SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", removed);
        rule(types.get(0), "IN_HOUSE", "INTERVAL_DAYS", 30, 35);
        rule(types.get(1), "OUTSOURCED", "INTERVAL_DAYS", 30, 35);
        rule(types.get(2), "IN_HOUSE", "ON_DEMAND", null, null);
        // SPEC-203 §3.4: qué se planifica en el conjunto es una asignación a cada regla.
        for (long type : types) {
            jdbc.update("""
                    INSERT INTO planning_assignments(set_id, activity_type_item_id, frequency_rule_key)
                    SELECT ?, ?, rule_key FROM maintenance_frequencies WHERE activity_type_item_id = ? AND valid_to IS NULL
                    ORDER BY id DESC LIMIT 1
                    """, set, type, type);
        }
    }

    private long zone(long sectionType) {
        String code = "PL-" + UUID.randomUUID().toString().substring(0, 8);
        return jdbc.queryForObject("INSERT INTO zones(code,name,zone_type_item_id) VALUES (?,?,?) RETURNING id",
                Long.class, code, "Zona " + code, sectionType);
    }

    private void rule(long type, String regime, String kind, Integer min, Integer max) {
        jdbc.update("""
                INSERT INTO maintenance_frequencies(activity_type_item_id, frequency_rule_type_item_id, regime, scope,
                    min_days_interval, max_days_interval, valid_from)
                SELECT ?, ci.id, ?, 'CAMPUS_WIDE', ?, ?, DATE '2026-01-01'
                FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'FREQUENCY_RULE_TYPE' AND ci.code = ?""", type, regime, min, max, kind);
    }

    private List<JsonNode> rowsOfMySet() throws Exception {
        var data = json.readTree(mvc.perform(get("/api/v1/maintenance/planning").with(user("c@test.local").authorities(() -> "COORDINADOR")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        var mine = new ArrayList<JsonNode>();
        for (JsonNode row : data) if (row.get("setId").asLong() == set) mine.add(row);
        return mine;
    }

    @Test
    void onlyAnInHouseRuleThatPlansJudgesTheSetAndADeletedSectionDoesNotCount() throws Exception {
        var rows = rowsOfMySet();

        assertThat(rows).hasSize(3);
        var planned = rows.stream().filter(r -> r.get("activityTypeItemId").asLong() == types.get(0)).findFirst().orElseThrow();
        assertThat(planned.get("state").asString()).isEqualTo("DUE");
        assertThat(planned.get("zoneCount").asInt()).isEqualTo(1);
        assertThat(planned.get("neverAttendedCount").asInt()).isEqualTo(1);
        assertThat(planned.get("rhythm").get("minDays").asInt()).isEqualTo(30);
        assertThat(rows).filteredOn(r -> r.get("activityTypeItemId").asLong() != types.get(0))
                .allSatisfy(r -> assertThat(r.get("state").asString()).isEqualTo("NOT_CONFIGURED"));
    }

    @Test
    void recentAttentionRequiresTheGardens() throws Exception {
        mvc.perform(get("/api/v1/maintenance/planning/recent-attention").with(user("c@test.local").authorities(() -> "COORDINADOR"))
                .param("activityTypeItemId", types.get(0).toString()).param("date", "2026-11-08"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/maintenance/planning/recent-attention").with(user("c@test.local").authorities(() -> "COORDINADOR"))
                .param("activityTypeItemId", types.get(0).toString()).param("date", "2026-11-08")
                .param("zoneIds", String.valueOf(kept)))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "OPERARIO"})
    void fieldRolesCannotPlan(String role) throws Exception {
        mvc.perform(get("/api/v1/maintenance/planning").with(user("x@test.local").authorities(() -> role)))
                .andExpect(status().isForbidden());
    }
}
