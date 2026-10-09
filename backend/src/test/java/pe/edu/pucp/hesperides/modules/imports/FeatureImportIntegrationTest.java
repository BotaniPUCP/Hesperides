package pe.edu.pucp.hesperides.modules.imports;

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
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Tachos y bebederos: carga por CSV, formulario y capa del mapa (SPEC-103 §6.3, §6.4, CA-10). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class FeatureImportIntegrationTest {

    /** 0.5 m en latitud: dentro del umbral de 1 m de los componentes. */
    private static final double HALF_METER = 0.5 / 110_574;

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

    private ResultActions preview(String kind, String csv) throws Exception {
        return mockMvc.perform(multipart("/api/v1/imports/" + kind + "/preview")
                .file(new MockMultipartFile("file", "carga.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))));
    }

    private long batchIdOf(ResultActions preview) throws Exception {
        return Long.parseLong(preview.andReturn().getResponse().getContentAsString().replaceAll(".*\"batchId\":(\\d+).*", "$1"));
    }

    private String attribute(String code, String key) {
        return jdbc.queryForObject("SELECT attributes ->> ? FROM campus_features WHERE code = ?", String.class, key, code);
    }

    @Test
    void theMapShowsTheSixtySevenFountainsWithKindAndStatus() throws Exception {
        String layers = mockMvc.perform(get("/api/v1/map/layers")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String compact = layers.replaceAll("\\s*:\\s*", ":");
        assertThat(compact.split("\"type\":\"DRINKING_FOUNTAIN\"", -1)).hasSize(68);
        assertThat(compact).contains("\"tipo\":\"BOTTLE_FILLER\"").contains("\"estado\":\"DETERIORATED\"");
    }

    @Test
    void aNewBinGetsItsOwnCodeAndItsWasteStreamsAsLabels() throws Exception {
        long batch = batchIdOf(preview("waste-bins", """
                latitud;longitud;lugar;residuos;accion
                -12.0702;-77.0810;Frente a Ciencias;plastico|Papel y Carton;Mantener
                """).andExpect(jsonPath("$.data.toCreate").value(1)).andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(jsonPath("$.data.created").value(1))
                .andExpect(jsonPath("$.data.createdCodes[0]", matchesPattern("TA-\\d{6}")));

        String code = jdbc.queryForObject("SELECT code FROM campus_features WHERE name = 'Frente a Ciencias'", String.class);
        assertThat(attribute(code, "residuos")).isEqualTo("[\"Plástico\", \"Papel y Cartón\"]");
        assertThat(attribute(code, "accion")).isEqualTo("Mantener");
    }

    @Test
    void correctingAFountainKeepsWhatTheRowDoesNotMention() throws Exception {
        String[] point = jdbc.queryForObject(
                "SELECT ST_Y(geom) || ';' || ST_X(geom) FROM campus_features WHERE code = 'PT_bb1'", String.class).split(";");
        long batch = batchIdOf(preview("drinking-fountains",
                "codigo;latitud;longitud;estado\nPT_bb1;" + point[0] + ";" + point[1] + ";en deterioro\n")
                .andExpect(jsonPath("$.data.toUpdate").value(1)));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(jsonPath("$.data.updated").value(1));

        assertThat(attribute("PT_bb1", "estado")).isEqualTo("DETERIORATED");
        assertThat(attribute("PT_bb1", "tipo")).isEqualTo("FOUNTAIN");
        assertThat(attribute("PT_bb1", "sector")).isEqualTo("CAMPUS");
    }

    @Test
    void aValueOutsideItsListBlocksTheLoad() throws Exception {
        preview("drinking-fountains", "latitud;longitud;estado\n-12.0702;-77.0810;roto\n")
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].column").value("estado"));
    }

    @Test
    void aFountainNextToAnotherIsAPossibleDuplicate() throws Exception {
        double lat = jdbc.queryForObject("SELECT ST_Y(geom) FROM campus_features WHERE code = 'PT_bb1'", Double.class);
        double lon = jdbc.queryForObject("SELECT ST_X(geom) FROM campus_features WHERE code = 'PT_bb1'", Double.class);

        preview("drinking-fountains", "latitud;longitud;lugar\n" + (lat + HALF_METER) + ";" + lon + ";Maestranza\n")
                .andExpect(jsonPath("$.data.duplicates", hasSize(1)))
                .andExpect(jsonPath("$.data.duplicates[0].duplicateOf").value("PT_bb1"))
                .andExpect(jsonPath("$.data.duplicates[0].label").value("Maestranza"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorRegistersAFountainByForm() throws Exception {
        String json = """
                {"kind":"drinking-fountains","lat":-12.0702,"lon":-77.0810,"place":"Bebedero de prueba",
                 "fountainKind":"BOTTLE_FILLER","fountainStatus":"NEW"}""";
        mockMvc.perform(multipart("/api/v1/campus-features")
                        .file(new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code", matchesPattern("BB-\\d{6}")));

        assertThat(jdbc.queryForObject("SELECT attributes ->> 'estado' FROM campus_features WHERE name = 'Bebedero de prueba'", String.class))
                .isEqualTo("NEW");
    }

    @Test
    void aFormValueOutsideItsListIsRejected() throws Exception {
        String json = "{\"kind\":\"waste-bins\",\"lat\":-12.0702,\"lon\":-77.0810,\"wasteStreams\":[\"Orgánicos\"]}";
        mockMvc.perform(multipart("/api/v1/campus-features")
                        .file(new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorCannotLoadBinsByCsv() throws Exception {
        preview("waste-bins", "latitud;longitud\n-12.0702;-77.0810\n").andExpect(status().isForbidden());
    }

    @Test
    void anUnknownKindIsA404() throws Exception {
        preview("benches", "latitud;longitud\n-12.0702;-77.0810\n").andExpect(status().isNotFound());
    }

    @Test
    void theTemplatesAreTheDocumentedOnes() throws Exception {
        for (String[] t : new String[][]{{"waste-bins", "tachos.csv"}, {"drinking-fountains", "bebederos.csv"},
                {"species-photos", "fotos-especies.csv"}}) {
            byte[] documented = Files.readAllBytes(Path.of("..", "docs", "estandares", "plantillas", t[1]));
            mockMvc.perform(get("/api/v1/imports/templates/" + t[0])).andExpect(content().bytes(documented));
        }
    }

    @Test
    void aSpeciesPhotoFromTheZipBecomesItsGenericPhoto() throws Exception {
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(600, 400, BufferedImage.TYPE_INT_RGB), "png", png);
        ByteArrayOutputStream zip = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(zip)) {
            z.putNextEntry(new ZipEntry("molle.png"));
            z.write(png.toByteArray());
            z.closeEntry();
        }
        String csv = """
                nombre_cientifico;foto
                Schinus molle;molle.png
                Planta inventada;x.png
                """;
        long batch = batchIdOf(mockMvc.perform(multipart("/api/v1/imports/species-photos/preview")
                        .file(new MockMultipartFile("file", "f.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "f.zip", "application/zip", zip.toByteArray())))
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(1))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(jsonPath("$.data.updated").value(1));

        mockMvc.perform(get("/api/v1/green-inventory/species/schinus-molle"))
                .andExpect(jsonPath("$.data.imageUrl", matchesPattern("/files/species/\\d+.*")));
    }
}
