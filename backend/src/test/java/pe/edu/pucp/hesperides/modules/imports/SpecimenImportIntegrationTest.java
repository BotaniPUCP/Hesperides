package pe.edu.pucp.hesperides.modules.imports;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.sql.Timestamp;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
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

    @Autowired
    private ObjectMapper objectMapper;

    private final Map<Long, String> planFingerprints = new HashMap<>();
    private final Map<Long, String> confirmationFingerprints = new HashMap<>();

    private ResultActions preview(String... rows) throws Exception {
        String csv = HEADER + "\n" + String.join("\n", rows) + "\n";
        return mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                .file(new MockMultipartFile("file", "carga.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))));
    }

    private long batchIdOf(ResultActions preview) throws Exception {
        JsonNode data = objectMapper.readTree(preview.andReturn().getResponse().getContentAsString()).path("data");
        long batchId = data.path("batchId").asLong();
        planFingerprints.put(batchId, data.path("planFingerprint").asString());
        confirmationFingerprints.remove(batchId);
        return batchId;
    }

    private void rememberPlan(ResultActions response) throws Exception {
        JsonNode data = objectMapper.readTree(response.andReturn().getResponse().getContentAsString()).path("data");
        long batchId = data.path("batchId").asLong();
        planFingerprints.put(batchId, data.path("planFingerprint").asString());
        confirmationFingerprints.remove(batchId);
    }

    private ResultActions requestSummary(long batchId, Map<Integer, Boolean> decisions) throws Exception {
        String request = objectMapper.writeValueAsString(Map.of(
                "duplicates", decisions, "planFingerprint", planFingerprints.get(batchId)));
        return mockMvc.perform(post("/api/v1/imports/{batchId}/confirmation-summary", batchId)
                .contentType(MediaType.APPLICATION_JSON).content(request));
    }

    private ResultActions confirmWithFingerprint(long batchId, Map<Integer, Boolean> decisions,
                                                  String summaryFingerprint) throws Exception {
        String request = objectMapper.writeValueAsString(Map.of(
                "duplicates", decisions, "summaryFingerprint", summaryFingerprint));
        return mockMvc.perform(post("/api/v1/imports/{batchId}/confirm", batchId)
                .contentType(MediaType.APPLICATION_JSON).content(request));
    }

    private ResultActions confirm(long batchId) throws Exception {
        return confirm(batchId, Map.of());
    }

    private ResultActions confirm(long batchId, Map<Integer, Boolean> decisions) throws Exception {
        String summaryFingerprint = confirmationFingerprints.get(batchId);
        if (summaryFingerprint == null) {
            ResultActions summaryResponse = requestSummary(batchId, decisions);
            if (summaryResponse.andReturn().getResponse().getStatus() >= 400) return summaryResponse;
            JsonNode summary = objectMapper.readTree(summaryResponse.andReturn().getResponse().getContentAsString())
                    .path("data");
            summaryFingerprint = summary.path("fingerprint").asString();
            confirmationFingerprints.put(batchId, summaryFingerprint);
        }
        return confirmWithFingerprint(batchId, decisions, summaryFingerprint);
    }

    @Test
    void aRowWithItsCodeUpdatesAndChangesTheHeight() throws Exception {
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;8.2;2026-05-01;")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        confirm(batch)
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
        confirm(batch).andExpect(status().isOk());

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
        confirm(batch).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(7.5);
    }

    @Test
    void aFormatErrorBlocksTheLoadAndPointsToRowAndColumn() throws Exception {
        long batch = batchIdOf(preview(";Schinus molle;;-77.0810;;;")
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].line").value(2))
                .andExpect(jsonPath("$.data.issues[0].column").value("latitud")));

        confirm(batch).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void aRepeatedExistingCodeInTheSameFileBlocksAllRows() throws Exception {
        Timestamp updatedBefore = jdbc.queryForObject(
                "SELECT updated_at FROM green_elements WHERE code = 'EV-000001'", Timestamp.class);
        long batch = batchIdOf(preview(
                "EV-000001;Roystonea regia;-12.067219;-77.079643;;;",
                "EV-000001;Roystonea regia;-12.067219;-77.079643;;;" )
                .andExpect(jsonPath("$.data.issues", hasSize(1)))
                .andExpect(jsonPath("$.data.issues[0].column").value("codigo"))
                .andExpect(jsonPath("$.data.canConfirm").value(false)));

        confirm(batch)
                .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT updated_at FROM green_elements WHERE code = 'EV-000001'", Timestamp.class))
                .isEqualTo(updatedBefore);
    }

    @Test
    void oneInvalidRowPreventsTheOtherwiseValidRowsFromBeingWritten() throws Exception {
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;\n"
                + ";Roystonea regia;latitude;-77.079643;;;\n";
        long batch = batchIdOf(upload(csv)
                .andExpect(jsonPath("$.data.toCreate").value(1))
                .andExpect(jsonPath("$.data.issues", hasSize(1)))
                .andExpect(jsonPath("$.data.canConfirm").value(false)));

        confirm(batch)
                .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();
    }

    @Test
    void anEmptyOrMalformedQuotedCsvIsRejectedBeforeCreatingABatch() throws Exception {
        mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "empty.csv", "text/csv", new byte[0])))
                .andExpect(status().isBadRequest());

        String malformed = HEADER + "\n;\"Schinus molle;-12.0702;-77.0810;;;\n";
        mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "broken.csv", "text/csv",
                                malformed.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isBadRequest());
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

        confirm(batch)
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

        confirm(batch).andExpect(status().isBadRequest());
        confirm(batch, Map.of(2, false))
                .andExpect(jsonPath("$.data.created").value(0))
                .andExpect(jsonPath("$.data.omittedDuplicates").value(1));
    }

    @Test
    void specimenConfirmationRequiresTheCurrentSummaryAndStaleDataCannotBeWritten() throws Exception {
        long batch = batchIdOf(preview(";Schinus molle;-12.0702;-77.0810;;;")
                .andExpect(jsonPath("$.data.toCreate").value(1)));

        mockMvc.perform(post("/api/v1/imports/{batchId}/confirm", batch)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"duplicates\":{}}"))
                .andExpect(status().isBadRequest());
        ResultActions summaryResponse = requestSummary(batch, Map.of());
        summaryResponse.andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toCreate").value(1))
                .andExpect(jsonPath("$.data.toUpdate").value(0));
        String fingerprint = objectMapper.readTree(summaryResponse.andReturn().getResponse().getContentAsString())
                .path("data").path("fingerprint").asString();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();

        jdbc.update("UPDATE species SET is_active = FALSE, updated_at = updated_at + INTERVAL '1 second' "
                + "WHERE slug = 'schinus-molle'");
        confirmWithFingerprint(batch, Map.of(), fingerprint).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();
    }

    @Test
    void reanalyzingAnIdenticalPlanInvalidatesItsPriorSummaryFingerprint() throws Exception {
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;\n";
        long batch = batchIdOf(upload(csv).andExpect(jsonPath("$.data.canConfirm").value(true)));
        String oldPlanFingerprint = planFingerprints.get(batch);
        ResultActions oldSummary = requestSummary(batch, Map.of()).andExpect(status().isOk());
        String oldSummaryFingerprint = objectMapper.readTree(oldSummary.andReturn().getResponse().getContentAsString())
                .path("data").path("fingerprint").asString();

        ResultActions reanalyzed = mockMvc.perform(multipart("/api/v1/imports/{batchId}/reanalyze", batch)
                        .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canConfirm").value(true));
        rememberPlan(reanalyzed);

        assertThat(planFingerprints.get(batch)).isNotEqualTo(oldPlanFingerprint);
        confirmWithFingerprint(batch, Map.of(), oldSummaryFingerprint).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();
    }

    @Test
    void aNewNearbyPlantAfterPreviewInvalidatesTheOldDuplicatePlan() throws Exception {
        String row = ";Schinus molle;-12.0702;-77.0810;;;";
        long staleBatch = batchIdOf(preview(row).andExpect(jsonPath("$.data.duplicates", hasSize(0))));
        long otherBatch = batchIdOf(preview(row).andExpect(jsonPath("$.data.duplicates", hasSize(0))));
        confirm(otherBatch)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(1));

        confirm(staleBatch)
                .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class,
                staleBatch)).isZero();
    }

    @Test
    void retryingAConfirmedImportReturnsTheSavedResultWithoutRepeatingWrites() throws Exception {
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;;;"));
        String firstResult = confirm(batch)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updated").value(1))
                .andReturn().getResponse().getContentAsString();

        confirm(batch)
                .andExpect(status().isOk())
                .andExpect(content().json(firstResult));
    }

    @Test
    void aDifferentUserCannotRecoverAConfirmedImportResult() throws Exception {
        long coordinatorRoleId = jdbc.queryForObject("SELECT ci.id FROM catalog_items ci JOIN catalog_types ct "
                + "ON ct.id = ci.catalog_type_id WHERE ct.code = 'ROLE' AND ci.code = 'COORDINADOR'", Long.class);
        jdbc.update("INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active) "
                        + "VALUES (?, 'x', 'Coord', 'Import', ?, TRUE)",
                "coordinador-import@pucp.edu.pe", coordinatorRoleId);
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;;;"));
        confirm(batch).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")
                        .with(user("coordinador-import@pucp.edu.pe")
                                .authorities(new SimpleGrantedAuthority("COORDINADOR"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Only who uploaded the file can confirm it"));
    }

    @Test
    void onlyTheUploaderCanRecoverAConfirmedResult() throws Exception {
        long coordinatorRoleId = jdbc.queryForObject("SELECT ci.id FROM catalog_items ci JOIN catalog_types ct "
                + "ON ct.id = ci.catalog_type_id WHERE ct.code = 'ROLE' AND ci.code = 'COORDINADOR'", Long.class);
        jdbc.update("INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active) "
                        + "VALUES (?, 'x', 'Coord', 'Import', ?, TRUE)",
                "coordinador-import@pucp.edu.pe", coordinatorRoleId);
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;;;"));
        confirm(batch).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")
                        .with(user("coordinador-import@pucp.edu.pe")
                                .authorities(new SimpleGrantedAuthority("COORDINADOR"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Only who uploaded the file can confirm it"));
    }

    @Test
    void anExpiredPreviewCannotBeConfirmedAndWritesNothing() throws Exception {
        long batch = batchIdOf(preview(";Schinus molle;-12.0702;-77.0810;;;"));
        jdbc.update("UPDATE import_batches SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = ?", batch);

        confirm(batch)
                .andExpect(status().isUnprocessableEntity());

        assertThat(jdbc.queryForObject("SELECT status FROM import_batches WHERE id = ?", String.class, batch))
                .isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();
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

        String code = confirm(batch)
                .andExpect(jsonPath("$.data.photoWarnings", hasSize(0)))
                .andReturn().getResponse().getContentAsString().replaceAll(".*\"createdCodes\":\\[\"([^\"]+)\".*", "$1");

        String key = jdbc.queryForObject("SELECT a.storage_key FROM green_element_attachments a "
                + "JOIN green_elements e ON e.id = a.green_element_id WHERE e.code = ?", String.class, code);
        assertThat(key).startsWith("green-elements/");
    }

    @Test
    void anInvalidPhotoImageWarnsButDoesNotDiscardTheSpecimenRow() throws Exception {
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;fotos/molle.png\n";
        long batch = batchIdOf(mockMvc.perform(
                        multipart("/api/v1/imports/specimens/preview")
                                .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv",
                                        csv.getBytes(StandardCharsets.UTF_8)))
                                .file(new MockMultipartFile("photos", "fotos.zip", "application/zip",
                                        zipWithContent("molle.png", "not an image".getBytes(StandardCharsets.UTF_8)))))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        confirm(batch)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(1))
                .andExpect(jsonPath("$.data.photoWarnings", hasSize(1)));
    }

    private static byte[] zipWith(String name) throws Exception {
        ByteArrayOutputStream image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB),
                "png", image);
        return zipWithContent(name, image.toByteArray());
    }

    private static byte[] zipWithContent(String name, byte[] image) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("fotos/" + name));
            zip.write(image);
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
        assertThat(template.lines().findFirst().orElseThrow().replaceFirst("^\uFEFF", "").split(";"))
                .containsExactlyElementsOf(SpecimenCsvSchema.COLUMNS);
    }

    @Test
    void aCorrectedSpeciesNameIsBoundToTheOriginalCsvGroupForEveryRowInTheSameBatch() throws Exception {
        String csv = HEADER + "\n;Nectandra testiana;-12.0702;-77.0810;;;\n"
                + ";Nectandra testiana;-12.0703;-77.0811;;;\n";
        long batch = batchIdOf(upload(csv)
                .andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(2))
                .andExpect(jsonPath("$.data.canConfirm").value(false)));

        String speciesJson = """
                {"scientificName":"Nectandra fictiva","vegetationTypeCode":"TREE"}
                """;
        mockMvc.perform(multipart("/api/v1/green-inventory/species")
                        .file(new MockMultipartFile("data", "species.json", "application/json",
                                speciesJson.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isCreated());
        long speciesId = jdbc.queryForObject(
                "SELECT id FROM species WHERE scientific_name = 'Nectandra fictiva' AND deleted_at IS NULL", Long.class);
        String slug = jdbc.queryForObject("SELECT slug FROM species WHERE id = ?", String.class, speciesId);

        ResultActions reanalyzed = mockMvc.perform(multipart("/api/v1/imports/" + batch + "/reanalyze")
                        .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("speciesBindings", "bindings.json", "application/json",
                                ("{\"nectandra testiana\":\"" + slug + "\"}").getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.batchId").value(batch))
                .andExpect(jsonPath("$.data.unknownSpecies", hasSize(0)))
                .andExpect(jsonPath("$.data.speciesBindings[0].sourceName").value("Nectandra testiana"))
                .andExpect(jsonPath("$.data.speciesBindings[0].scientificName").value("Nectandra fictiva"))
                .andExpect(jsonPath("$.data.speciesBindings[0].rows").value(2))
                .andExpect(jsonPath("$.data.toCreate").value(2));
        rememberPlan(reanalyzed);

        confirm(batch)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(2));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE species_id = ? AND import_batch_id = ?",
                Integer.class, speciesId, batch)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species_common_names WHERE species_id = ? AND name = ?",
                Integer.class, speciesId, "Nectandra testiana")).isZero();
    }

    @Test
    void aFreshPreviewAfterExpiryCanKeepTheBatchLocalSpeciesBinding() throws Exception {
        String csv = HEADER + "\n;Imported source name;-12.0702;-77.0810;;;\n";
        long expiredBatch = batchIdOf(upload(csv).andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(1)));
        jdbc.update("UPDATE import_batches SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = ?",
                expiredBatch);
        confirm(expiredBatch)
                .andExpect(status().isUnprocessableEntity());

        String binding = "{\"imported source name\":\"schinus-molle\"}";
        ResultActions freshPreview = mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("speciesBindings", "bindings.json", "application/json",
                                binding.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unknownSpecies", hasSize(0)))
                .andExpect(jsonPath("$.data.speciesBindings[0].resolution").value("USER_SELECTED"));
        long freshBatch = batchIdOf(freshPreview);
        assertThat(freshBatch).isNotEqualTo(expiredBatch);

        confirm(freshBatch)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(1));
        assertThat(jdbc.queryForObject("SELECT species_id FROM green_elements WHERE import_batch_id = ?", Long.class, freshBatch))
                .isEqualTo(jdbc.queryForObject("SELECT id FROM species WHERE slug = 'schinus-molle'", Long.class));
    }

    @Test
    void anExplicitSelectionLinksToAnExistingSpeciesWithoutChangingItsCatalogData() throws Exception {
        String originalName = jdbc.queryForObject("SELECT scientific_name FROM species WHERE slug = 'schinus-molle'", String.class);
        String originalCommonName = jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class);
        String csv = HEADER + "\n;Nombre de la fuente;-12.0702;-77.0810;;;\n";
        long batch = batchIdOf(upload(csv)
                .andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(1)));

        ResultActions reanalyzed = mockMvc.perform(multipart("/api/v1/imports/" + batch + "/reanalyze")
                        .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("speciesBindings", "bindings.json", "application/json",
                                "{\"nombre de la fuente\":\"schinus-molle\"}".getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unknownSpecies", hasSize(0)))
                .andExpect(jsonPath("$.data.speciesBindings[0].resolution").value("USER_SELECTED"));
        rememberPlan(reanalyzed);

        confirm(batch).andExpect(status().isOk());
        Long linkedId = jdbc.queryForObject("SELECT species_id FROM green_elements WHERE import_batch_id = ?", Long.class, batch);
        assertThat(linkedId).isEqualTo(jdbc.queryForObject("SELECT id FROM species WHERE slug = 'schinus-molle'", Long.class));
        assertThat(jdbc.queryForObject("SELECT scientific_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isEqualTo(originalName);
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isEqualTo(originalCommonName);
    }

    @Test
    void anInactiveSpeciesIsUnresolvedAndCannotBeUsedForNewSpecimenImport() throws Exception {
        jdbc.update("UPDATE species SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE slug = 'schinus-molle'");
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;\n";
        long batch = batchIdOf(upload(csv)
                .andExpect(jsonPath("$.data.unknownSpecies[0].reason").value("INACTIVE"))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.canConfirm").value(false)));

        confirm(batch).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug = 'schinus-molle'", Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();
    }

    @Test
    void aSpeciesDeactivatedAfterPreviewCannotBeUsedAtImportConfirmation() throws Exception {
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;\n";
        long batch = batchIdOf(upload(csv).andExpect(jsonPath("$.data.toCreate").value(1)));
        jdbc.update("UPDATE species SET is_active = FALSE, updated_at = updated_at + INTERVAL '1 second' "
                + "WHERE slug = 'schinus-molle'");

        confirm(batch)
                .andExpect(status().isUnprocessableEntity());

        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug = 'schinus-molle'", Boolean.class))
                .isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ?", Integer.class, batch))
                .isZero();
    }

    @Test
    void updatingAnInactiveSpecimenPreservesItsState() throws Exception {
        jdbc.update("UPDATE green_elements SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE code = 'EV-000001'");
        String csv = "codigo;nombre_cientifico;latitud;longitud;observaciones\n"
                + "EV-000001;Roystonea regia;-12.067219;-77.079643;Corrección de datos\n";
        long batch = batchIdOf(upload(csv)
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        confirm(batch).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT is_active FROM green_elements WHERE code = 'EV-000001'", Boolean.class))
                .isFalse();
        assertThat(jdbc.queryForObject("SELECT notes FROM green_elements WHERE code = 'EV-000001'", String.class))
                .isEqualTo("Corrección de datos");
    }

    @Test
    void aSpecimenStateChangeAfterPreviewDoesNotBlockOrGetRevertedByImport() throws Exception {
        String csv = "codigo;nombre_cientifico;latitud;longitud;observaciones\n"
                + "EV-000001;Roystonea regia;-12.067219;-77.079643;Corrección posterior\n";
        long batch = batchIdOf(upload(csv).andExpect(jsonPath("$.data.toUpdate").value(1)));
        jdbc.update("UPDATE green_elements SET is_active = FALSE, updated_at = updated_at + INTERVAL '1 second' "
                + "WHERE code = 'EV-000001'");

        confirm(batch).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT is_active FROM green_elements WHERE code = 'EV-000001'", Boolean.class))
                .isFalse();
        assertThat(jdbc.queryForObject("SELECT notes FROM green_elements WHERE code = 'EV-000001'", String.class))
                .isEqualTo("Corrección posterior");
    }

    @Test
    void aUniqueDocumentedAlternativeNameResolvesToItsSpecies() throws Exception {
        jdbc.update("INSERT INTO species_common_names (species_id, name) SELECT id, ? FROM species WHERE slug = 'schinus-molle'",
                "Nombre alternativo import test");
        long batch = batchIdOf(preview(";Nombre alternativo import test;-12.0702;-77.0810;;;" )
                .andExpect(jsonPath("$.data.unknownSpecies", hasSize(0)))
                .andExpect(jsonPath("$.data.speciesBindings[0].resolution").value("ALTERNATIVE_NAME")));
        confirm(batch).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_elements WHERE import_batch_id = ? AND species_id = "
                + "(SELECT id FROM species WHERE slug = 'schinus-molle')", Integer.class, batch)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug = 'schinus-molle'", Boolean.class)).isTrue();
    }

    @Test
    void anAmbiguousAlternativeNameIsNotAutoAssociated() throws Exception {
        jdbc.update("UPDATE species SET is_active = FALSE WHERE slug = 'schinus-molle'");
        jdbc.update("INSERT INTO species_common_names (species_id, name) SELECT id, ? FROM species "
                        + "WHERE slug IN ('schinus-molle', 'tipuana-tipu')",
                "Alias ambiguo import test");

        preview(";Alias ambiguo import test;-12.0702;-77.0810;;;")
                .andExpect(jsonPath("$.data.unknownSpecies[0].reason").value("AMBIGUOUS"))
                .andExpect(jsonPath("$.data.unknownSpecies[0].rows").value(1))
                .andExpect(jsonPath("$.data.toCreate").value(0));

        mockMvc.perform(get("/api/v1/imports/specimens/species-options")
                        .param("search", "Alias ambiguo import test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].slug").value("tipuana-tipu"))
                .andExpect(jsonPath("$.data[0].active").value(true));
    }

    @Test
    void aBadLocationIsReportedEvenWhenTheSpeciesNameIsUnknown() throws Exception {
        preview(";Nombre botánico desconocido;-77.0810;-12.0702;;;")
                .andExpect(jsonPath("$.data.issues", hasSize(1)))
                .andExpect(jsonPath("$.data.issues[0].column").value("latitud"))
                .andExpect(jsonPath("$.data.unknownSpecies", hasSize(0)))
                .andExpect(jsonPath("$.data.canConfirm").value(false));
    }

    @Test
    void aMissingPhotoIsReportedEvenWhenTheSpeciesNameIsUnknown() throws Exception {
        preview(";Nombre botánico desconocido;-12.0702;-77.0810;;;foto_ausente.jpg")
                .andExpect(jsonPath("$.data.issues", hasSize(1)))
                .andExpect(jsonPath("$.data.issues[0].column").value("foto"))
                .andExpect(jsonPath("$.data.unknownSpecies", hasSize(0)))
                .andExpect(jsonPath("$.data.canConfirm").value(false));
    }

    @Test
    void aCorruptPhotosZipIsRejectedEvenWhenNoCsvRowReferencesAPhoto() throws Exception {
        String csv = HEADER + "\n;Schinus molle;-12.0702;-77.0810;;;\n";
        mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "fotos.zip", "application/zip",
                                "not a zip".getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "ejemplares.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "empty.zip", "application/zip", new byte[0])))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anEmptyQuantityAndPartialMeasurementDoNotEraseExistingValues() throws Exception {
        long groupTypeId = jdbc.queryForObject("SELECT ci.id FROM catalog_items ci JOIN catalog_types ct "
                + "ON ct.id = ci.catalog_type_id WHERE ct.code = 'GREEN_ELEMENT_TYPE' AND ci.code = 'GROUP'", Long.class);
        jdbc.update("UPDATE green_elements SET quantity = 4, element_type_item_id = ?, height_m = 7.5, "
                        + "trunk_height_m = 2.0, dbh_cm = 30, crown_radius_m = 3.0, is_banded = TRUE, "
                        + "data_source = 'MEASURED', measured_at = ?, updated_at = CURRENT_TIMESTAMP WHERE code = 'EV-000001'",
                groupTypeId, LocalDate.now().minusDays(2));
        LocalDate measuredOn = LocalDate.now().minusDays(1);
        String csv = "codigo;nombre_cientifico;latitud;longitud;cantidad;fecha_medicion;altura_m;altura_fuste_m;dap_cm;radio_copa_m;zunchado\n"
                + "EV-000001;Roystonea regia;-12.067219;-77.079643;;" + measuredOn + ";9.0;;;;\n";
        long batch = batchIdOf(upload(csv).andExpect(jsonPath("$.data.toUpdate").value(1)));
        confirm(batch).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT quantity FROM green_elements WHERE code = 'EV-000001'", Integer.class))
                .isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT element_type_item_id FROM green_elements WHERE code = 'EV-000001'", Long.class))
                .isEqualTo(groupTypeId);
        assertThat(jdbc.queryForObject("SELECT height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(9.0);
        assertThat(jdbc.queryForObject("SELECT trunk_height_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(2.0);
        assertThat(jdbc.queryForObject("SELECT dbh_cm FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(30.0);
        assertThat(jdbc.queryForObject("SELECT crown_radius_m FROM green_elements WHERE code = 'EV-000001'", Double.class))
                .isEqualTo(3.0);
        assertThat(jdbc.queryForObject("SELECT is_banded FROM green_elements WHERE code = 'EV-000001'", Boolean.class))
                .isTrue();
    }

    @Test
    void aSpecimenChangedAfterPreviewIsNotSilentlyOverwritten() throws Exception {
        long batch = batchIdOf(preview("EV-000001;Roystonea regia;-12.067219;-77.079643;;;")
                .andExpect(jsonPath("$.data.toUpdate").value(1)));
        jdbc.update("UPDATE green_elements SET notes = 'Cambio manual posterior', updated_at = updated_at + INTERVAL '1 second' "
                + "WHERE code = 'EV-000001'");

        confirm(batch).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT notes FROM green_elements WHERE code = 'EV-000001'", String.class))
                .isEqualTo("Cambio manual posterior");
    }
}
