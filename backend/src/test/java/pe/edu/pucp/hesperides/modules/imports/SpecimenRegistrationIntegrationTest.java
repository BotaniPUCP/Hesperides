package pe.edu.pucp.hesperides.modules.imports;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Registro por formulario y evaluaciones (SPEC-103 §5.1, CA-01, CA-07 a CA-09). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
class SpecimenRegistrationIntegrationTest {

    private static final String SPECIMENS = "/api/v1/green-inventory/specimens";
    /** Un molle en un punto libre del campus. */
    private static final String MOLLE = """
            {"scientificName":"Schinus molle","lat":-12.0702,"lon":-77.0810,
             "measurement":{"date":"2026-09-01","heightM":4.2,"dbhCm":20}}""";

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

    @BeforeEach
    void aSupervisorExists() {
        jdbc.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT 'supervisor@pucp.edu.pe', 'x', 'Rosa', 'Quispe', ci.id FROM catalog_items ci
                  JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'ROLE' AND ci.code = 'SUPERVISOR'
                   AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'supervisor@pucp.edu.pe')""");
    }

    private static MockMultipartFile data(String json) {
        return new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8));
    }

    private ResultActions register(String json, String query) throws Exception {
        return mockMvc.perform(multipart(SPECIMENS + query).file(data(json)));
    }

    private static String codeOf(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString().replaceAll(".*\"code\":\"([^\"]+)\".*", "$1");
    }

    @Test
    void aSupervisorRegistersAPlantAndItAppearsOnTheMap() throws Exception {
        String code = codeOf(register(MOLLE, "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code", startsWith("EV-"))));

        assertThat(jdbc.queryForObject("SELECT data_source FROM green_elements WHERE code = ?", String.class, code))
                .isEqualTo("MEASURED");
        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(code)));
    }

    @Test
    void aPlantNextToOneOfItsSpeciesAsksBeforeRegistering() throws Exception {
        String palm = "{\"scientificName\":\"Roystonea regia\",\"lat\":" + (-12.067219 + 0.8 / 110_574) + ",\"lon\":-77.079643}";

        register(palm, "")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.data.duplicateOf").value("EV-000001"))
                .andExpect(jsonPath("$.data.distanceM").value(0.8));
        register(palm, "?confirmDuplicate=true").andExpect(status().isCreated());
    }

    @Test
    void anUnknownSpeciesIsRejected() throws Exception {
        register("{\"scientificName\":\"Planta inventada\",\"lat\":-12.0702,\"lon\":-77.0810}", "")
                .andExpect(status().isBadRequest());
    }

    @Test
    void aMeasurementWithoutDateIsRejected() throws Exception {
        register("""
                {"scientificName":"Schinus molle","lat":-12.0702,"lon":-77.0810,"measurement":{"heightM":4.2}}""", "")
                .andExpect(status().isBadRequest());
    }

    @Test
    void thePhotoIsStoredAndOnlyItsKeyIsInTheDatabase() throws Exception {
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1200, 900, BufferedImage.TYPE_INT_RGB), "png", png);

        String code = codeOf(mockMvc.perform(multipart(SPECIMENS).file(data(MOLLE))
                        .file(new MockMultipartFile("photo", "molle.png", "image/png", png.toByteArray())))
                .andExpect(status().isCreated()));

        String key = jdbc.queryForObject("SELECT a.storage_key FROM green_element_attachments a "
                + "JOIN green_elements e ON e.id = a.green_element_id WHERE e.code = ?", String.class, code);
        assertThat(key).startsWith("green-elements/" + code + "/");
    }

    /** Sin la transacción del test: tiene que verse el rollback real del servicio. */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void aFileThatIsNotAnImageCancelsTheRegistration() throws Exception {
        long before = jdbc.queryForObject("SELECT count(*) FROM green_elements", Long.class);
        mockMvc.perform(multipart(SPECIMENS).file(data(MOLLE))
                        .file(new MockMultipartFile("photo", "molle.png", "image/png", "no soy imagen".getBytes())))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements", Long.class)).isEqualTo(before);
    }

    @Test
    void theHistoryKeepsEveryAssessmentWithTheLatestFirst() throws Exception {
        String code = codeOf(register(MOLLE, ""));
        assess(code, "{\"date\":\"2026-03-01\",\"hasDeadBranches\":true,\"recommendedManagement\":\"Poda\"}");
        assess(code, "{\"date\":\"2026-08-01\",\"hasDeadBranches\":false}");

        mockMvc.perform(get(SPECIMENS + "/" + code + "/assessments"))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].date").value("2026-08-01"))
                .andExpect(jsonPath("$.data[0].assessedBy").value("Rosa Quispe"))
                .andExpect(jsonPath("$.data[1].recommendedManagement").value("Poda"));
    }

    private void assess(String code, String json) throws Exception {
        mockMvc.perform(post(SPECIMENS + "/" + code + "/assessments")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated());
    }

    @Test
    void anAssessmentInTheFutureIsRejected() throws Exception {
        mockMvc.perform(post(SPECIMENS + "/EV-000001/assessments")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"date\":\"2999-01-01\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theHumidForestCeibaIsMeasuredWithItsAssessment() throws Exception {
        mockMvc.perform(get("/api/v1/green-inventory/specimens/EV-000951"))
                .andExpect(jsonPath("$.data.heightM").value(10.5));
        mockMvc.perform(get(SPECIMENS + "/EV-000951/assessments"))
                .andExpect(jsonPath("$.data[0].date").value("2026-01-01"));
    }

    @Test
    void aCorrectionKeepsWhatItDoesNotMention() throws Exception {
        mockMvc.perform(multipart(SPECIMENS + "/EV-000001").file(data("""
                        {"scientificName":"Roystonea regia","lat":-12.067219,"lon":-77.079643,"notes":"Revisada"}"""))
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(7.5);
        assertThat(jdbc.queryForObject("SELECT notes FROM green_elements WHERE code = 'EV-000001'", String.class))
                .isEqualTo("Revisada");
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperarioCannotRegister() throws Exception {
        register(MOLLE, "").andExpect(status().isForbidden());
    }

    @Test
    void aSupervisorCannotChangeTheSpeciesPhoto() throws Exception {
        mockMvc.perform(multipart("/api/v1/green-inventory/species/schinus-molle/photo")
                        .file(new MockMultipartFile("photo", "m.png", "image/png", new byte[]{1})))
                .andExpect(status().isForbidden());
    }
}
