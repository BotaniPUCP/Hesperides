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
        // Su único jardín nunca se atendió: falta, y así lo dice el desglose por unidad.
        long garden = jdbc.queryForObject("SELECT zone_id FROM green_area_set_zones WHERE set_id = ?", Long.class, set);
        assertThat(row.get("upToDateCount").asInt()).isZero();
        assertThat(row.get("pendingZoneIds").get(0).asLong()).isEqualTo(garden);
        assertThat(row.get("pendingElementIds")).isEmpty();
        assertThat(row.get("lastDates").get(0).get("date").isNull()).isTrue();
        assertThat(row.get("lastDates").get(0).get("count").asInt()).isEqualTo(1);
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

    /**
     * Lo que promete el aviso al editar: «El cambio rige desde hoy y se aplica a las planificaciones
     * que usan esta frecuencia. Los reportes de meses anteriores mantienen la frecuencia vigente en su momento».
     */
    @Test
    void editingAppliesFromTodayToThePlanningAndPastReportsKeepTheVersionInEffectThen() throws Exception {
        assign(forSets, 201);
        jdbc.update("UPDATE maintenance_frequencies SET valid_from = DATE '2026-01-01', created_at = TIMESTAMP '2026-01-01' WHERE id = ?", forSets);

        send(put("/api/v1/maintenance/frequencies/" + forSets).with(user("a@test.local").authorities(() -> "ADMIN")),
                Map.of("minDaysInterval", 10, "maxDaysInterval", 12), 200);
        long current = jdbc.queryForObject("""
                SELECT id FROM maintenance_frequencies
                WHERE rule_key = (SELECT rule_key FROM maintenance_frequencies WHERE id = ?) AND valid_to IS NULL""",
                Long.class, forSets);
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate lastMonth = today.minusMonths(1).withDayOfMonth(1);
        attended(lastMonth.plusDays(9));

        // La planificación toma el cambio hoy mismo.
        assertThat(current).isNotEqualTo(forSets);
        assertThat(rowOfMySet().get("rhythm").get("minDays").asInt()).isEqualTo(10);

        // El jardín del conjunto, atendido el mes pasado, se juzga ese mes entero con la versión
        // anterior; un periodo que cruza el cambio se parte en dos tramos, cada uno con la suya.
        assertThat(versionsJudgingMyGarden(lastMonth, lastMonth.withDayOfMonth(lastMonth.lengthOfMonth()))).containsOnly(forSets);
        assertThat(versionsJudgingMyGarden(today.minusDays(3), today)).containsExactly(forSets, current);
    }

    /**
     * Una intervención de personal propio que completó el jardín del conjunto ese día (11:00 en Lima) y
     * quedó aprobada: los reportes solo cuentan trabajo aprobado (SPEC-200 D-06); la planificación, el completado.
     */
    private void attended(java.time.LocalDate day) {
        for (String email : List.of("c@test.local", "v@test.local")) {
            jdbc.update("""
                    INSERT INTO users(email, password_hash, first_name, last_name, role_item_id)
                    SELECT ?, 'test', 'Coordinación', 'Test',
                           (SELECT id FROM catalog_items WHERE code = 'COORDINADOR'
                              AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'ROLE'))
                    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)""", email, email);
        }
        long work = jdbc.queryForObject("""
                INSERT INTO interventions (intervention_class_item_id, intervention_type_item_id, planning_status_item_id,
                    created_by_user_id, scheduled_date, origin_item_id, reported_by_item_id)
                SELECT a.parent_item_id, a.id, st.id, u.id, ?, o.id, n.id
                FROM catalog_items a, users u,
                     catalog_items st JOIN catalog_types stt ON stt.id = st.catalog_type_id AND stt.code = 'INTERVENTION_STATUS',
                     catalog_items o JOIN catalog_types ot ON ot.id = o.catalog_type_id AND ot.code = 'INTERVENTION_ORIGIN',
                     catalog_items n JOIN catalog_types nt ON nt.id = n.catalog_type_id AND nt.code = 'INCIDENT_SOURCE'
                WHERE a.id = ? AND u.email = 'c@test.local' AND st.code = 'ASSIGNED' AND o.code = 'MAINTENANCE' AND n.code = 'NONE'
                RETURNING id""", Long.class, day, activity);
        jdbc.update("""
                INSERT INTO intervention_locations (intervention_id, client_reference, zone_id, status_item_id, attempt_number,
                    started_at, completed_at, validated_at, executed_by_user_id, validated_by_user_id)
                SELECT ?, gen_random_uuid(), gz.zone_id, st.id, 1, ?::timestamp, ?::timestamp, ?::timestamp, u.id, v.id
                FROM green_area_set_zones gz, users u, users v,
                     catalog_items st JOIN catalog_types t ON t.id = st.catalog_type_id AND t.code = 'INTERVENTION_STATUS'
                WHERE gz.set_id = ? AND st.code = 'VALIDATED' AND u.email = 'c@test.local' AND v.email = 'v@test.local'""",
                work, day + " 13:00", day + " 16:00", day + " 18:00", set);
    }

    /** Con qué versión de la regla se juzgó, tramo por tramo, el jardín de mi conjunto en el periodo. */
    private List<Long> versionsJudgingMyGarden(java.time.LocalDate from, java.time.LocalDate to) throws Exception {
        JsonNode rows = send(get("/api/v1/maintenance/frequencies/compliance").param("from", from.toString())
                .param("to", to.toString()).param("activityTypeItemId", Long.toString(activity)), null, 200).get("data");
        List<Long> ids = new java.util.ArrayList<>();
        for (JsonNode row : rows) {
            if (!"IN_HOUSE".equals(row.get("regime").asString())) continue;
            for (JsonNode location : row.get("locations")) {
                for (JsonNode segment : location.get("segments")) ids.add(segment.get("evaluatedWithConfigId").asLong());
            }
        }
        assertThat(ids).as("el jardín del conjunto aparece en el cumplimiento").isNotEmpty();
        return ids;
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
