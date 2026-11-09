package pe.edu.pucp.hesperides.modules.planning.sets;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-203 §3.1 contra una base real: el SQL de pertenencia, los permisos y los errores. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class GreenAreaSetsIntegrationTest {

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

    private String coordinator;
    private List<Long> sections;
    private long sector;
    private long activity;

    @BeforeEach
    void data() {
        coordinator = "coord-" + UUID.randomUUID() + "@test.local";
        jdbc.update("""
                INSERT INTO users(email,password_hash,first_name,last_name,role_item_id) VALUES (?,'x','C','C',
                (SELECT id FROM catalog_items WHERE code='COORDINADOR' AND catalog_type_id=(SELECT id FROM catalog_types WHERE code='ROLE')))""",
                coordinator);
        sector = jdbc.queryForObject("SELECT id FROM zones WHERE code = 'SEC-VERDE-02'", Long.class);
        sections = jdbc.queryForList("SELECT id FROM zones WHERE parent_zone_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 2",
                Long.class, sector);
        activity = jdbc.queryForObject("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.deleted_at IS NULL ORDER BY ci.id LIMIT 1""", Long.class);
    }

    private RequestPostProcessor as(String email, String role) {
        return user(email).authorities(() -> role);
    }

    private String body(String name, List<Long> zones, Long version) {
        return json.writeValueAsString(new java.util.HashMap<>(Map.of("name", name, "zoneIds", zones,
                "activityTypeItemIds", List.of(activity))) {{ if (version != null) put("version", version); }});
    }

    private JsonNode create(String name, List<Long> zones, int expected) throws Exception {
        var response = mvc.perform(post("/api/v1/green-area-sets").with(as(coordinator, "COORDINADOR"))
                        .contentType(MediaType.APPLICATION_JSON).content(body(name, zones, null)))
                .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    @Test
    void aCoordinatorCreatesASetAndSeesItWithItsGardenCount() throws Exception {
        String name = "Prueba " + UUID.randomUUID();
        long id = create(name, sections, 201).get("data").get("id").asLong();

        var list = json.readTree(mvc.perform(get("/api/v1/green-area-sets").with(as(coordinator, "COORDINADOR")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        JsonNode mine = null;
        for (JsonNode row : list) if (row.get("id").asLong() == id) mine = row;
        assertThat(mine).isNotNull();
        assertThat(mine.get("zoneCount").asInt()).isEqualTo(2);
        assertThat(mine.get("activities").get(0).get("id").asLong()).isEqualTo(activity);

        var detail = json.readTree(mvc.perform(get("/api/v1/green-area-sets/" + id).with(as(coordinator, "COORDINADOR")))
                .andReturn().getResponse().getContentAsString()).get("data");
        assertThat(detail.get("zones")).hasSize(2);
        assertThat(detail.get("zones").get(0).get("displayName").asString()).isNotBlank();
    }

    @Test
    void anInactiveSectionLeavesTheSetDetail() throws Exception {
        long id = create("Inactiva " + UUID.randomUUID(), sections, 201).get("data").get("id").asLong();
        jdbc.update("UPDATE zones SET is_active = FALSE WHERE id = ?", sections.get(1));
        try {
            var detail = json.readTree(mvc.perform(get("/api/v1/green-area-sets/" + id).with(as(coordinator, "COORDINADOR")))
                    .andReturn().getResponse().getContentAsString()).get("data");
            assertThat(detail.get("zones")).hasSize(1);
            assertThat(detail.get("zones").get(0).get("id").asLong()).isEqualTo(sections.get(0));
        } finally {
            jdbc.update("UPDATE zones SET is_active = TRUE WHERE id = ?", sections.get(1));
        }
    }

    @Test
    void aSectorCannotBeAddedAsAGarden() throws Exception {
        var error = create("Con sector " + UUID.randomUUID(), List.of(sector), 422);
        assertThat(error.get("message").asString()).isEqualTo("Solo se pueden agregar secciones: " + sector);
    }

    @Test
    void anOldVersionConflictsAndTheRightOneAdvances() throws Exception {
        String name = "Versiones " + UUID.randomUUID();
        long id = create(name, sections, 201).get("data").get("id").asLong();
        mvc.perform(put("/api/v1/green-area-sets/" + id).with(as(coordinator, "COORDINADOR"))
                .contentType(MediaType.APPLICATION_JSON).content(body(name, sections.subList(0, 1), 0L)))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/green-area-sets/" + id).with(as(coordinator, "COORDINADOR"))
                .contentType(MediaType.APPLICATION_JSON).content(body(name, sections, 0L)))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM green_area_set_zones WHERE set_id = ? AND deleted_at IS NULL""", Integer.class, id))
                .isEqualTo(1);
    }

    @Test
    void aDeletedSetFreesItsName() throws Exception {
        String name = "Baja " + UUID.randomUUID();
        long id = create(name, sections, 201).get("data").get("id").asLong();
        mvc.perform(delete("/api/v1/green-area-sets/" + id).with(as(coordinator, "COORDINADOR"))).andExpect(status().isOk());
        create(name.toUpperCase(), sections, 201);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "OPERARIO"})
    void fieldRolesCannotUseSets(String role) throws Exception {
        mvc.perform(get("/api/v1/green-area-sets").with(as("x@test.local", role))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/green-area-sets").with(as("x@test.local", role))
                .contentType(MediaType.APPLICATION_JSON).content(body("X", sections, null)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/green-area-sets/1").with(as("x@test.local", role))).andExpect(status().isForbidden());
    }
}
