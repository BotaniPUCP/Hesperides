package pe.edu.pucp.hesperides.modules.places;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

/** La cola de migración de las 411 referencias antiguas al catálogo de lugares. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class ReferenceMigrationIntegrationTest {

    private static final String LINKS = "/api/v1/places/reference-links";
    /** «Espalda de civil», sembrada en V011. */
    private static final String ESPALDA_CIVIL = "REF-0267";

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private ResultActions postJson(String url, String body) throws Exception {
        return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    /** Un lugar dibujado justo sobre el punto de la referencia. */
    private String placeOnReference(String name, String referenceCode) throws Exception {
        Map<String, Object> at = jdbc.queryForMap(
                "SELECT ST_X(location) AS lon, ST_Y(location) AS lat FROM place_references WHERE code = ?", referenceCode);
        String json = postJson("/api/v1/places", """
                {"name": "%s", "kindCode": "OUTDOOR", "categoryCode": "FACULTADES",
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}}""".formatted(name, at.get("lon"), at.get("lat")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.data.code");
    }

    private int pending() throws Exception {
        String json = mockMvc.perform(get(LINKS + "/progress")).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.data.pending");
    }

    @Test
    void atTheStartEveryReferenceIsPending() throws Exception {
        int active = jdbc.queryForObject("SELECT count(*) FROM place_references WHERE deleted_at IS NULL AND is_active", Integer.class);

        mockMvc.perform(get(LINKS + "/progress")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(active))
                .andExpect(jsonPath("$.data.pending").value(active))
                .andExpect(jsonPath("$.data.linked").value(0));
    }

    @Test
    void repeatedNamesComeAsOneGroupLargestFirst() throws Exception {
        mockMvc.perform(get(LINKS + "/queue")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[0].name").value("Tontodromo – educación"))
                .andExpect(jsonPath("$.data.groups[0].referenceCodes.length()").value(13));
    }

    @Test
    void suggestsThePlaceAndTheSideOfAReference() throws Exception {
        placeOnReference("Ingeniería Civil", ESPALDA_CIVIL);

        String json = mockMvc.perform(get(LINKS + "/queue").param("q", "espalda de civil"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> groups = JsonPath.read(json, "$.data.groups[?(@.referenceCodes[0] == '" + ESPALDA_CIVIL + "')]");
        Map<String, Object> group = groups.get(0);
        org.assertj.core.api.Assertions.assertThat(group.get("detectedSide")).isEqualTo("BACK");
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(group, "$.suggestions[0].place.name")).isEqualTo("Ingeniería Civil");
    }

    @Test
    void linkingTakesTheReferenceOutOfTheQueueAndKeepsItsNameAsAnAlias() throws Exception {
        String code = placeOnReference("Ingeniería Civil", ESPALDA_CIVIL);
        int before = pending();

        postJson(LINKS, "{\"referenceCodes\": [\"%s\"], \"placeCode\": \"%s\"}".formatted(ESPALDA_CIVIL, code))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(pending()).isEqualTo(before - 1);
        mockMvc.perform(get("/api/v1/places/" + code)).andExpect(jsonPath("$.data.aliases", hasItem("Espalda de civil")));
        mockMvc.perform(get(LINKS + "/queue").param("q", "espalda de civil"))
                .andExpect(jsonPath("$.data.groups[*].referenceCodes[*]", not(hasItem(ESPALDA_CIVIL))));
    }

    @Test
    void aReferenceCanBeLinkedToAPerspectiveOfThatPlace() throws Exception {
        String code = placeOnReference("Ingeniería Civil", ESPALDA_CIVIL);
        Map<String, Object> at = jdbc.queryForMap("SELECT ST_X(location) AS lon, ST_Y(location) AS lat FROM place_references WHERE code = ?", ESPALDA_CIVIL);
        String json = postJson("/api/v1/places/" + code + "/perspectives", "{\"sideCode\": \"BACK\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 0}"
                .formatted((double) at.get("lat") - 0.0002, at.get("lon"))).andReturn().getResponse().getContentAsString();
        Number perspective = JsonPath.read(json, "$.data.id");

        postJson(LINKS, "{\"referenceCodes\": [\"%s\"], \"placeCode\": \"%s\", \"perspectiveId\": %s}".formatted(ESPALDA_CIVIL, code, perspective))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT perspective_id FROM place_reference_links WHERE deleted_at IS NULL", Long.class)).isEqualTo(perspective.longValue());
    }

    @Test
    void aPerspectiveOfAnotherPlaceIsRejected() throws Exception {
        String civil = placeOnReference("Ingeniería Civil", ESPALDA_CIVIL);
        String other = placeOnReference("Otro lugar", ESPALDA_CIVIL);
        Map<String, Object> at = jdbc.queryForMap("SELECT ST_X(location) AS lon, ST_Y(location) AS lat FROM place_references WHERE code = ?", ESPALDA_CIVIL);
        String json = postJson("/api/v1/places/" + other + "/perspectives", "{\"sideCode\": \"BACK\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 0}"
                .formatted((double) at.get("lat") - 0.0002, at.get("lon"))).andReturn().getResponse().getContentAsString();
        Number perspective = JsonPath.read(json, "$.data.id");

        postJson(LINKS, "{\"referenceCodes\": [\"%s\"], \"placeCode\": \"%s\", \"perspectiveId\": %s}".formatted(ESPALDA_CIVIL, civil, perspective))
                .andExpect(status().isNotFound());
    }

    @Test
    void aReferenceAlreadyDecidedCannotBeDecidedAgain() throws Exception {
        postJson(LINKS + "/discard", "{\"referenceCodes\": [\"%s\"]}".formatted(ESPALDA_CIVIL)).andExpect(status().isOk());

        postJson(LINKS + "/discard", "{\"referenceCodes\": [\"%s\"]}".formatted(ESPALDA_CIVIL)).andExpect(status().isConflict());
        mockMvc.perform(get(LINKS + "/progress")).andExpect(jsonPath("$.data.discarded").value(1));
    }

    @Test
    void deletingThePlaceReturnsItsReferencesToTheQueue() throws Exception {
        String code = placeOnReference("Ingeniería Civil", ESPALDA_CIVIL);
        int before = pending();
        postJson(LINKS, "{\"referenceCodes\": [\"%s\"], \"placeCode\": \"%s\"}".formatted(ESPALDA_CIVIL, code)).andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/places/" + code)).andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(pending()).isEqualTo(before);
    }

    @Test
    void anUnknownReferenceIsNotFound() throws Exception {
        postJson(LINKS + "/discard", "{\"referenceCodes\": [\"REF-9999\"]}").andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void onlyEditorsMigrate() throws Exception {
        mockMvc.perform(get(LINKS + "/queue")).andExpect(status().isForbidden());
        postJson(LINKS + "/discard", "{\"referenceCodes\": [\"%s\"]}".formatted(ESPALDA_CIVIL)).andExpect(status().isForbidden());
    }

    @Test
    void theQueueSearchMatchesAnyPartOfTheName() throws Exception {
        mockMvc.perform(get(LINKS + "/queue").param("q", "gelarti"))
                .andExpect(jsonPath("$.data.groups[*].name", everyItem(org.hamcrest.Matchers.containsStringIgnoringCase("gelarti"))));
    }
}
