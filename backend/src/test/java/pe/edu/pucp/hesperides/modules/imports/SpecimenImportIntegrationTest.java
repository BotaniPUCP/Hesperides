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
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema;
import pe.edu.pucp.hesperides.support.TestDatabase;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Carga de ejemplares por CSV (SPEC-103 §5.2, CA-02 a CA-06 y CA-11). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class SpecimenImportIntegrationTest {

    private static final String HEADER = "codigo;nombre_cientifico;latitud;longitud;altura_m;fecha_medicion;foto";
    /** 0.8 m en latitud, en grados: la distancia de CA-06. */
    private static final double EIGHTY_CM = 0.8 / 110_574;

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

    private ResultActions preview(String... rows) throws Exception {
        String csv = HEADER + "\n" + String.join("\n", rows) + "\n";
        return mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                .file(new MockMultipartFile("file", "carga.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))));
    }

    private long batchIdOf(ResultActions preview) throws Exception {
        String body = preview.andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"batchId\":(\\d+).*", "$1"));
    }

    @Test
    void aRowWithItsCodeUpdatesAndChangesTheHeight() throws Exception {
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;8.2;2026-05-01;")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updated").value(1));

        assertThat(jdbc.queryForObject("SELECT height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(8.2);
    }

    private String exported() throws Exception {
        return mockMvc.perform(get("/api/v1/green-inventory/export.csv"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private ResultActions upload(String csv) throws Exception {
        return mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))));
    }

    @Test
    void exportCorrectAndLoadAgainUpdatesTheSpecimen() throws Exception {
        List<String> lines = exported().lines().toList();
        String header = lines.get(0);
        String palm = lines.stream().filter(l -> l.startsWith("EV-000001;")).findFirst().orElseThrow();
        assertThat(palm).contains(";7.5;");

        long batch = batchIdOf(upload(header + "\n" + palm.replace(";7.5;", ";9.1;").replace("2026-01-01", "2026-06-01") + "\n")
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(9.1);
        // El enlace de Drive ya era suyo: volver a cargarlo no duplica la foto.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_element_attachments a JOIN green_elements e "
                + "ON e.id = a.green_element_id WHERE e.code = 'EV-000001'", Integer.class)).isZero();
    }

    @Test
    void theWholeExportLoadsBackWithoutErrors() throws Exception {
        String csv = exported();
        int specimens = jdbc.queryForObject(
                "SELECT count(*) FROM green_elements WHERE deleted_at IS NULL AND is_active AND species_id IS NOT NULL",
                Integer.class);
        assertThat(csv.lines().count()).isEqualTo(specimens + 1L);

        upload(csv)
                .andExpect(jsonPath("$.data.issues", hasSize(0)))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.toUpdate").value(specimens));
    }

    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorCannotExport() throws Exception {
        mockMvc.perform(get("/api/v1/green-inventory/export.csv")).andExpect(status().isForbidden());
    }

    @Test
    void anOlderMeasurementDoesNotReplaceTheCurrentOne() throws Exception {
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;3.0;2020-01-01;"));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(7.5);
    }

    @Test
    void aFormatErrorBlocksTheLoadAndPointsToRowAndColumn() throws Exception {
        long batch = batchIdOf(preview(";Schinus molle;;-77.0810;;;")
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].line").value(2))
                .andExpect(jsonPath("$.data.issues[0].column").value("latitud")));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void unknownSpeciesAreOmittedAndCountedWhileTheRestLoads() throws Exception {
        List<String> rows = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            rows.add(";Planta inventada;-12.0700;" + (-77.0810 - i * 0.0001) + ";;;");
        }
        for (int i = 0; i < 6; i++) {
            rows.add(";Schinus molle;-12.0702;" + (-77.0810 - i * 0.0001) + ";;;");
        }
        long batch = batchIdOf(preview(rows.toArray(String[]::new))
                .andExpect(jsonPath("$.data.toCreate").value(6))
                .andExpect(jsonPath("$.data.unknownSpecies[0].name").value("Planta inventada"))
                .andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(4))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(jsonPath("$.data.created").value(6))
                .andExpect(jsonPath("$.data.createdCodes", hasSize(6)))
                .andExpect(jsonPath("$.data.createdCodes[0]", startsWith("EV-")))
                .andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(4));
    }

    @Test
    void aPalmAt80cmIsAPossibleDuplicateButAShrubIsNot() throws Exception {
        preview(";Roystonea regia;" + (-12.067219 + EIGHTY_CM) + ";-77.079643;;;",
                ";Coffea arabica;" + (-12.069346138867 + EIGHTY_CM) + ";-77.0802947133823;;;")
                .andExpect(jsonPath("$.data.duplicates", hasSize(1)))
                .andExpect(jsonPath("$.data.duplicates[0].line").value(2))
                .andExpect(jsonPath("$.data.duplicates[0].duplicateOf").value("EV-000001"));
    }

    @Test
    void everyPossibleDuplicateNeedsADecision() throws Exception {
        long batch = batchIdOf(preview(";Roystonea regia;" + (-12.067219 + EIGHTY_CM) + ";-77.079643;;;"));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"duplicates\":{\"2\":false}}"))
                .andExpect(jsonPath("$.data.created").value(0))
                .andExpect(jsonPath("$.data.omittedDuplicates").value(1));
    }

    @Test
    void aConfirmedImportCannotBeConfirmedTwice() throws Exception {
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;;;"));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void aPointFarFromTheCampusIsACoordinateError() throws Exception {
        // Latitud y longitud invertidas: cae en otro continente.
        preview(";Schinus molle;-77.0810;-12.0702;;;")
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].column").value("latitud"));
    }

    @Test
    void aPhotoLinkOutsideDriveIsAFormatError() throws Exception {
        preview(";Schinus molle;-12.0702;-77.0810;;;http://localhost:8080/api/v1/users")
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].column").value("foto"));
    }

    @Test
    void aPhotoNamedButMissingFromTheZipIsAFormatError() throws Exception {
        preview(";Schinus molle;-12.0702;-77.0810;;;molle.jpg")
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].column").value("foto"));
    }

    @Test
    void aPhotoFromTheZipIsStoredOutsideTheDatabase() throws Exception {
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;fotos/molle.png\n";
        long batch = batchIdOf(mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "carga.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "fotos.zip", "application/zip", zipWith("molle.png"))))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        String code = mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(jsonPath("$.data.photoWarnings", hasSize(0)))
                .andReturn().getResponse().getContentAsString().replaceAll(".*\"createdCodes\":\\[\"([^\"]+)\".*", "$1");

        String key = jdbc.queryForObject("SELECT a.storage_key FROM green_element_attachments a "
                + "JOIN green_elements e ON e.id = a.green_element_id WHERE e.code = ?", String.class, code);
        assertThat(key).startsWith("green-elements/");
    }

    private static byte[] zipWith(String name) throws Exception {
        ByteArrayOutputStream image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB),
                "png", image);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("fotos/" + name));
            zip.write(image.toByteArray());
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorCannotLoadCsv() throws Exception {
        preview(";Schinus molle;-12.0702;-77.0810;;;").andExpect(status().isForbidden());
    }

    @Test
    void theTemplateIsTheDocumentedOne() throws Exception {
        byte[] documented = Files.readAllBytes(Path.of("..", "docs", "estandares", "plantillas", "ejemplares.csv"));
        mockMvc.perform(get("/api/v1/imports/templates/specimens"))
                .andExpect(status().isOk())
                .andExpect(content().bytes(documented));
    }

    @Test
    void theTemplateHeaderIsTheStandard() throws Exception {
        String template = mockMvc.perform(get("/api/v1/imports/templates/specimens"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(template.lines().findFirst().orElseThrow().split(";"))
                .containsExactlyElementsOf(SpecimenCsvSchema.COLUMNS);
    }
}
