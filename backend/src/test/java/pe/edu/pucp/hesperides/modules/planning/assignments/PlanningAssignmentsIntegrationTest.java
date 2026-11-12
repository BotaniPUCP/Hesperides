package pe.edu.pucp.hesperides.modules.planning.assignments;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-203 §3.4 contra una base real: asignar, cambiar y quitar la frecuencia que se planifica en un conjunto. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class PlanningAssignmentsIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    private static final String URL = "/api/v1/maintenance/planning/assignments";

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private long set;
    private long activity;
    private long otherActivity;
    private long forSets;
    private long forSetsIntensive;
    private long outsourced;
    private long ofOtherActivity;

    @BeforeEach
    void data() {
        List<Long> types = jdbc.queryForList("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.deleted_at IS NULL
                  AND NOT EXISTS (SELECT 1 FROM maintenance_frequencies f WHERE f.activity_type_item_id = ci.id)
                ORDER BY ci.id DESC LIMIT 2""", Long.class);
        activity = types.get(0);
        otherActivity = types.get(1);
        long section = jdbc.queryForObject("""
                SELECT z.id FROM zones z JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = 'SECTION'
                WHERE z.deleted_at IS NULL AND z.is_active ORDER BY z.id LIMIT 1""", Long.class);
        set = jdbc.queryForObject("INSERT INTO green_area_sets(name) VALUES (?) RETURNING id", Long.class,
                "Asignaciones " + UUID.randomUUID());
        jdbc.update("INSERT INTO green_area_set_zones(set_id, zone_id) VALUES (?,?)", set, section);
        forSets = rule(activity, "IN_HOUSE", "BY_SET", 5, 8);
        forSetsIntensive = rule(activity, "IN_HOUSE", "BY_SET", 2, 3);
        outsourced = rule(activity, "OUTSOURCED", "BY_SET", 5, 8);
        ofOtherActivity = rule(otherActivity, "IN_HOUSE", "BY_SET", 5, 8);
    }

    private long rule(long type, String regime, String scope, int min, int max) {
        return jdbc.queryForObject("""
                INSERT INTO maintenance_frequencies(activity_type_item_id, frequency_rule_type_item_id, regime, scope,
                    min_days_interval, max_days_interval, valid_from)
                SELECT ?, ci.id, ?, ?, ?, ?, DATE '2026-01-01'
                FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'FREQUENCY_RULE_TYPE' AND ci.code = 'INTERVAL_DAYS' RETURNING id""",
                Long.class, type, regime, scope, min, max);
    }

    private static RequestPostProcessor coordinator() {
        return user("c@test.local").authorities(() -> "COORDINADOR");
    }

    private JsonNode send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
                          Object body, int expected) throws Exception {
        var builder = request.with(coordinator());
        if (body != null) builder = builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return json.readTree(mvc.perform(builder).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString());
    }

    private JsonNode assign(long frequency, int expected) throws Exception {
        return send(post(URL), Map.of("setId", set, "frequencyId", frequency), expected);
    }

    private JsonNode rowOfMySet() throws Exception {
        JsonNode found = null;
        for (JsonNode row : send(get("/api/v1/maintenance/planning"), null, 200).get("data")) {
            if (row.get("setId").asLong() == set) found = row;
        }
        return found;
    }

    @Test
    void anAssignedFrequencyBecomesAPlanningRowOfThatSet() throws Exception {
        assertThat(rowOfMySet()).isNull();

        JsonNode created = assign(forSets, 201).get("data");

        assertThat(created.get("activityTypeItemId").asLong()).isEqualTo(activity);
        JsonNode row = rowOfMySet();
        assertThat(row.get("assignmentId").asLong()).isEqualTo(created.get("id").asLong());
        assertThat(row.get("ruleKey").asString()).isEqualTo(created.get("ruleKey").asString());
        assertThat(row.get("rhythm").get("minDays").asInt()).isEqualTo(5);
        assertThat(row.get("ownRule").asBoolean()).isTrue();
    }

    @Test
    void aSetHasOneFrequencyPerActivity() throws Exception {
        assign(forSets, 201);

        JsonNode error = assign(forSetsIntensive, 409);

        assertThat(error.get("message").asString()).contains("ya tiene una planificación de").contains("Edítala");
    }

    @Test
    void outsourcedFrequenciesAreNotPlanned() throws Exception {
        assertThat(assign(outsourced, 422).get("message").asString()).isEqualTo("Las frecuencias tercerizadas no se planifican");
    }

    @Test
    void changingKeepsTheActivityAndMovesTheRow() throws Exception {
        long id = assign(forSets, 201).get("data").get("id").asLong();

        send(put(URL + "/" + id), Map.of("frequencyId", forSetsIntensive), 200);
        assertThat(rowOfMySet().get("rhythm").get("minDays").asInt()).isEqualTo(2);

        JsonNode error = send(put(URL + "/" + id), Map.of("frequencyId", ofOtherActivity), 422);
        assertThat(error.get("message").asString()).startsWith("La frecuencia nueva debe ser de ");
    }

    @Test
    void editingTheFrequencyKeepsTheAssignmentOnItsNewVersion() throws Exception {
        assign(forSets, 201);
        // Una versión que ya rigió días cerrados: editarla abre otra fila con la misma regla.
        jdbc.update("UPDATE maintenance_frequencies SET valid_from = DATE '2026-01-01', created_at = TIMESTAMP '2026-01-01' WHERE id = ?", forSets);

        send(put("/api/v1/maintenance/frequencies/" + forSets).with(user("a@test.local").authorities(() -> "ADMIN")),
                Map.of("minDaysInterval", 10, "maxDaysInterval", 12), 200);

        assertThat(jdbc.queryForObject("SELECT valid_to IS NOT NULL FROM maintenance_frequencies WHERE id = ?", Boolean.class, forSets)).isTrue();
        assertThat(rowOfMySet().get("rhythm").get("minDays").asInt()).isEqualTo(10);
    }

    @Test
    void theFrequencyListSaysHowManySetsUseEachRule() throws Exception {
        assign(forSets, 201);

        JsonNode list = send(get("/api/v1/maintenance/frequencies"), null, 200).get("data");
        JsonNode mine = null;
        for (JsonNode f : list) if (f.get("id").asLong() == forSets) mine = f;
        assertThat(mine.get("assignedSetCount").asInt()).isEqualTo(1);

        JsonNode byRule = send(get(URL).param("ruleKey", mine.get("ruleKey").asString()), null, 200).get("data");
        assertThat(byRule).hasSize(1);
        assertThat(byRule.get(0).get("setId").asLong()).isEqualTo(set);
    }

    @Test
    void aSetLeftWithoutGardensIsNotCountedBecauseItHasNoCard() throws Exception {
        assign(forSets, 201);
        // Su único jardín se dio de baja: la planificación no lo muestra, así que Frecuencias tampoco lo cuenta.
        jdbc.update("UPDATE green_area_set_zones SET deleted_at = now() WHERE set_id = ?", set);

        assertThat(rowOfMySet()).isNull();
        JsonNode mine = null;
        for (JsonNode f : send(get("/api/v1/maintenance/frequencies"), null, 200).get("data")) {
            if (f.get("id").asLong() == forSets) mine = f;
        }
        assertThat(mine.get("assignedSetCount").asInt()).isZero();
    }

    @Test
    void removingAnAssignmentRemovesItsRow() throws Exception {
        long id = assign(forSets, 201).get("data").get("id").asLong();

        send(delete(URL + "/" + id), null, 200);

        assertThat(rowOfMySet()).isNull();
        assign(forSets, 201);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "OPERARIO"})
    void onlyCoordinationAssigns(String role) throws Exception {
        mvc.perform(get(URL).with(user("x@test.local").authorities(() -> role))).andExpect(status().isForbidden());
        mvc.perform(post(URL).with(user("x@test.local").authorities(() -> role)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("setId", set, "frequencyId", forSets)))).andExpect(status().isForbidden());
    }
}
