package pe.edu.pucp.hesperides.modules.inventory;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-105 §4.4 y §5.6 contra PostGIS real. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class ExtraMeasuresIntegrationTest {

    private static final String BASE = "/api/v1/green-inventory";
    private static final String COORDINATOR_EMAIL = "extra-coordinator@test.local";
    private static final RequestPostProcessor COORDINATOR = user(COORDINATOR_EMAIL).authorities(() -> "COORDINADOR");
    private static final RequestPostProcessor SUPERVISOR = user("extra-supervisor@test.local").authorities(() -> "SUPERVISOR");

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper json;

    @BeforeEach
    void coordinatorExists() {
        jdbc.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT ?, 'test', 'Test', 'Coordinator', ci.id FROM catalog_items ci
                  JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = 'ROLE' AND ci.code = 'COORDINADOR'
                   AND NOT EXISTS (SELECT 1 FROM users WHERE email = ?)""", COORDINATOR_EMAIL, COORDINATOR_EMAIL);
    }

    private String unmeasured(String slug) {
        return jdbc.queryForObject("""
                SELECT e.code FROM green_elements e JOIN species s ON s.id = e.species_id
                 WHERE s.slug = ? AND e.deleted_at IS NULL AND e.is_active AND e.data_source <> 'MEASURED'
                 ORDER BY e.code LIMIT 1""", String.class, slug);
    }

    private ResultActions measure(String code, String scientificName, Map<String, Object> measurement) throws Exception {
        var position = jdbc.queryForMap("SELECT st_y(location) lat, st_x(location) lon FROM green_elements WHERE code = ?", code);
        var form = Map.of("scientificName", scientificName, "lat", position.get("lat"), "lon", position.get("lon"),
                "measurement", measurement);
        var data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(form));
        return mockMvc.perform(multipart(HttpMethod.PUT, BASE + "/specimens/" + code).file(data).with(COORDINATOR));
    }

    private static Map<String, Object> value(String code, Number value) {
        return Map.of("code", code, "value", value);
    }

    private ResultActions createMeasure(String label, String unitCode, RequestPostProcessor actor) throws Exception {
        return mockMvc.perform(post(BASE + "/extra-measures").with(actor).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("label", label, "unitCode", unitCode))));
    }

    private ResultActions editExtras(String slug, String scientificName, String typeCode, List<Map<String, String>> extras)
            throws Exception {
        var form = new LinkedHashMap<String, Object>();
        form.put("scientificName", scientificName);
        form.put("vegetationTypeCode", typeCode);
        form.put("extraMeasures", extras);
        return mockMvc.perform(put(BASE + "/species/" + slug).with(COORDINATOR).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(form)));
    }

    @Test
    void migrationAssignsTheInitialMeasuresWithTheirReference() throws Exception {
        mockMvc.perform(get(BASE + "/species/bougainvillea-glabra"))
                .andExpect(jsonPath("$.data.extraMeasures", hasSize(2)))
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("SUPPORT_HEIGHT"))
                .andExpect(jsonPath("$.data.extraMeasures[0].unitCode").value("M"))
                .andExpect(jsonPath("$.data.extraMeasures[0].referenceNote").value("≈ 2.5 m (estimación del equipo)"))
                .andExpect(jsonPath("$.data.extraMeasures[1].code").value("COVERED_LENGTH"));
        mockMvc.perform(get(BASE + "/species/dracaena-fragrans"))
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("STEM_COUNT"))
                .andExpect(jsonPath("$.data.extraMeasures[0].unitCode").value("UNIT"))
                .andExpect(jsonPath("$.data.extraMeasures[0].label").value("Número de tallos"));
        mockMvc.perform(get(BASE + "/species/agave-americana"))
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("FLOWER_STALK_HEIGHT"));
        mockMvc.perform(get(BASE + "/species/chlorophytum-comosum"))
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("COVERAGE_AREA"))
                .andExpect(jsonPath("$.data.extraMeasures[0].unitCode").value("M2"));
        mockMvc.perform(get(BASE + "/species/coffea-arabica"))
                .andExpect(jsonPath("$.data.extraMeasures", hasSize(0)));
    }

    @Test
    void theCatalogListsActiveMeasures() throws Exception {
        mockMvc.perform(get(BASE + "/extra-measures").with(SUPERVISOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", hasItems("SUPPORT_HEIGHT", "COVERED_LENGTH", "FLOWER_STALK_HEIGHT",
                        "STEM_COUNT", "COVERAGE_AREA")));
    }

    @Test
    void onlyManagersCreateMeasuresAndNamesAreUniqueIgnoringAccentsAndCase() throws Exception {
        createMeasure("Diámetro de roseta", "M", SUPERVISOR).andExpect(status().isForbidden());

        createMeasure("Diámetro de roseta", "M", COORDINATOR)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value("DIAMETRO_DE_ROSETA"))
                .andExpect(jsonPath("$.data.unitCode").value("M"));

        createMeasure("DIAMETRO DE ROSETA", "UNIT", COORDINATOR).andExpect(status().isConflict());
    }

    @Test
    void aNewMeasureNeedsAValidUnit() throws Exception {
        createMeasure("Medida sin unidad", "PARSEC", COORDINATOR).andExpect(status().isBadRequest());
    }

    @Test
    void editingAssignsAndRemovesMeasuresKeepingTheirValuesInTheHistory() throws Exception {
        String code = unmeasured("leea-guineensis");
        var form = new LinkedHashMap<String, Object>();
        form.put("scientificName", "Leea guineensis");
        form.put("vegetationTypeCode", "SHRUB");
        form.put("referenceHeightM", 2.5);
        form.put("referenceHeightSourceCode", "BOTANICAL_SHEET");
        form.put("referenceCrownRadiusM", 0.9);
        form.put("referenceCrownRadiusSourceCode", "BOTANICAL_SHEET");
        form.put("extraMeasures", List.of(Map.of("code", "STEM_COUNT", "referenceNote", "2 tallos")));
        mockMvc.perform(put(BASE + "/species/leea-guineensis").with(COORDINATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(form)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.extraMeasures[0].referenceNote").value("2 tallos"));
        measure(code, "Leea guineensis", Map.of("date", "2026-02-01", "extraValues", List.of(value("STEM_COUNT", 4))))
                .andExpect(status().isOk());

        form.put("extraMeasures", List.of());
        mockMvc.perform(put(BASE + "/species/leea-guineensis").with(COORDINATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(form)))
                .andExpect(jsonPath("$.data.extraMeasures", hasSize(0)));

        mockMvc.perform(get(BASE + "/specimens/" + code + "/measurements"))
                .andExpect(jsonPath("$.data[0].extraValues[0].code").value("STEM_COUNT"))
                .andExpect(jsonPath("$.data[0].extraValues[0].value").value(4.0));
        measure(code, "Leea guineensis", Map.of("date", "2026-03-01", "extraValues", List.of(value("STEM_COUNT", 5))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void omittingTheMeasuresOnEditKeepsThem() throws Exception {
        var form = new LinkedHashMap<String, Object>();
        form.put("scientificName", "Dracaena fragrans");
        form.put("vegetationTypeCode", "SHRUB");
        mockMvc.perform(put(BASE + "/species/dracaena-fragrans").with(COORDINATOR).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(form)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("STEM_COUNT"));
    }

    @Test
    void anUnknownMeasureCannotBeAssigned() throws Exception {
        editExtras("delonix-regia", "Delonix regia", "TREE", List.of(Map.of("code", "NO_EXISTE")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerAcceptsMeasures() throws Exception {
        var form = Map.of("scientificName", "Testus adicionalis", "vegetationTypeCode", "TREE",
                "extraMeasures", List.of(Map.of("code", "STEM_COUNT")));
        var data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(form));

        mockMvc.perform(multipart(BASE + "/species").file(data).with(COORDINATOR))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("STEM_COUNT"));
    }

    @Test
    void measuringOnlyAnExtraMeasureDoesNotMakeTheSpecimenMeasured() throws Exception {
        String code = unmeasured("dracaena-fragrans");

        measure(code, "Dracaena fragrans", Map.of("date", "2026-02-01", "extraValues", List.of(value("STEM_COUNT", 3))))
                .andExpect(status().isOk());

        mockMvc.perform(get(BASE + "/specimens/" + code))
                .andExpect(jsonPath("$.data.measurementStatus").value("NOT_MEASURED"))
                .andExpect(jsonPath("$.data.extraMeasures[0].code").value("STEM_COUNT"))
                .andExpect(jsonPath("$.data.extraMeasures[0].label").value("Número de tallos"))
                .andExpect(jsonPath("$.data.extraMeasures[0].unitCode").value("UNIT"))
                .andExpect(jsonPath("$.data.extraMeasures[0].value").value(3.0))
                .andExpect(jsonPath("$.data.extraMeasures[0].measuredAt").value("2026-02-01"));
    }

    @Test
    void theSheetShowsTheLastValueOfEachMeasureEvenIfTheLatestMeasurementOmitsIt() throws Exception {
        String code = unmeasured("bougainvillea-glabra");
        measure(code, "Bougainvillea glabra", Map.of("date", "2026-02-01", "heightM", 3.0,
                "extraValues", List.of(value("SUPPORT_HEIGHT", 2.4), value("COVERED_LENGTH", 3.1))))
                .andExpect(status().isOk());
        measure(code, "Bougainvillea glabra", Map.of("date", "2026-03-01", "heightM", 3.2,
                "extraValues", List.of(value("SUPPORT_HEIGHT", 2.5))))
                .andExpect(status().isOk());
        measure(code, "Bougainvillea glabra", Map.of("date", "2026-04-01", "heightM", 3.4))
                .andExpect(status().isOk());

        mockMvc.perform(get(BASE + "/specimens/" + code))
                .andExpect(jsonPath("$.data.measurementStatus").value("MEASURED"))
                .andExpect(jsonPath("$.data.extraMeasures", hasSize(2)))
                .andExpect(jsonPath("$.data.extraMeasures[?(@.code == 'SUPPORT_HEIGHT')].value").value(2.5))
                .andExpect(jsonPath("$.data.extraMeasures[?(@.code == 'SUPPORT_HEIGHT')].measuredAt").value("2026-03-01"))
                .andExpect(jsonPath("$.data.extraMeasures[?(@.code == 'COVERED_LENGTH')].value").value(3.1));
    }

    @Test
    void aCountMustBeWholeAndAMeasureMustBelongToTheSpecies() throws Exception {
        String code = unmeasured("dracaena-fragrans");
        Integer before = jdbc.queryForObject("SELECT count(*) FROM green_element_measurements", Integer.class);

        measure(code, "Dracaena fragrans", Map.of("date", "2026-02-01", "extraValues", List.of(value("STEM_COUNT", 2.5))))
                .andExpect(status().isBadRequest());
        measure(code, "Dracaena fragrans", Map.of("date", "2026-02-01", "extraValues", List.of(value("COVERAGE_AREA", 1))))
                .andExpect(status().isBadRequest());
        measure(code, "Dracaena fragrans", Map.of("date", "2026-02-01", "extraValues", List.of(value("STEM_COUNT", -1))))
                .andExpect(status().isBadRequest());
        measure(code, "Dracaena fragrans", Map.of("date", "2026-02-01",
                "extraValues", List.of(value("STEM_COUNT", 1), value("STEM_COUNT", 2))))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_element_measurements", Integer.class)).isEqualTo(before);
    }

    @Test
    void theUnitOfAMeasureWithValuesCannotChange() throws Exception {
        RequestPostProcessor admin = user("extra-admin@test.local").authorities(() -> "ADMIN");
        String code = unmeasured("chlorophytum-comosum");
        measure(code, "Chlorophytum comosum", Map.of("date", "2026-02-01", "extraValues", List.of(value("COVERAGE_AREA", 1))))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/catalogs/EXTRA_MEASURE/items/COVERAGE_AREA").with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("label", "Cobertura", "metadata", Map.of("unitCode", "M")))))
                .andExpect(status().isUnprocessableContent());

        mockMvc.perform(put("/api/v1/catalogs/EXTRA_MEASURE/items/COVERAGE_AREA").with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("label", "Superficie cubierta"))))
                .andExpect(status().isOk());
    }

    @Test
    void theGeneralCatalogCannotCreateAMeasureWithoutUnit() throws Exception {
        mockMvc.perform(post("/api/v1/catalogs/EXTRA_MEASURE/items").with(user("extra-admin@test.local").authorities(() -> "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("code", "SIN_UNIDAD", "label", "Sin unidad"))))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void theReferenceIsNeverAttributedToASpecimen() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/" + unmeasured("agave-americana")))
                .andExpect(jsonPath("$.data.extraMeasures", hasSize(0)));
    }
}
