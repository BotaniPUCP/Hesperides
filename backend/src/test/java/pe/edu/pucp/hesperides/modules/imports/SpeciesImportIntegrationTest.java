package pe.edu.pucp.hesperides.modules.imports;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesCsvSchema;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Carga y exportación masiva de especies botánicas por CSV (SPEC-103 §6.6 y SPEC-105 §5.1). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class SpeciesImportIntegrationTest {

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

    private ResultActions preview(String csv) throws Exception {
        return mockMvc.perform(multipart("/api/v1/imports/species/preview")
                .file(new MockMultipartFile("file", "especies.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))));
    }

    private long batchIdOf(ResultActions preview) throws Exception {
        return Long.parseLong(preview.andReturn().getResponse().getContentAsString().replaceAll(".*\"batchId\":(\\d+).*", "$1"));
    }

    @Test
    void theSpeciesTemplateMatchesTheDocumentedOneAndHeaderStandard() throws Exception {
        byte[] documented = Files.readAllBytes(Path.of("..", "docs", "estandares", "plantillas", "especies.csv"));
        byte[] downloaded = mockMvc.perform(get("/api/v1/imports/templates/species"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(downloaded, StandardCharsets.UTF_8).replaceFirst("^\uFEFF", "").getBytes(StandardCharsets.UTF_8))
                .containsExactly(documented);
        String template = new String(downloaded, StandardCharsets.UTF_8);

        assertThat(template.lines().findFirst().orElseThrow().replaceFirst("^\uFEFF", "").split(";"))
                .containsExactlyElementsOf(SpeciesCsvSchema.COLUMNS);

        // La plantilla con su fila de ejemplo es 100% válida al previsualizarla.
        preview(template)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canConfirm").value(true))
                .andExpect(jsonPath("$.data.issues", hasSize(0)));
    }

    @Test
    void createsNewSpeciesAndUpdatesExistingWithoutErasingBlankOptionalFields() throws Exception {
        String csv = """
                nombre_cientifico;nombre_comun;nombres_alternativos;familia;tipo_vegetacion;origen;es_critica;altura_promedio_m;fuente_altura;radio_copa_promedio_m;fuente_radio_copa
                Tabebuia rosea;Roble morado;Apamate|Guayacán rosado;Bignoniaceae;Árbol;Introducida;si;14.0;Ficha botánica;4.5;Ficha botánica
                Schinus molle;;;Anacardiaceae;;Nativa;;;;;
                """;

        long batch = batchIdOf(preview(csv)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(2))
                .andExpect(jsonPath("$.data.toCreate").value(1))
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(1))
                .andExpect(jsonPath("$.data.updated").value(1))
                .andExpect(jsonPath("$.data.createdCodes[0]").value("tabebuia-rosea"));

        String createdCommon = jdbc.queryForObject(
                "SELECT common_name FROM species WHERE slug = 'tabebuia-rosea'", String.class);
        assertThat(createdCommon).isEqualTo("Roble morado");
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug = 'tabebuia-rosea'", Boolean.class))
                .isTrue();

        String preservedCommon = jdbc.queryForObject(
                "SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class);
        assertThat(preservedCommon).isNotBlank();
    }

    @Test
    void exportIncludesInactiveSpeciesWithLivingSpecimensAndReimportPreservesTheirState() throws Exception {
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM green_elements e JOIN species s ON s.id=e.species_id
                 WHERE s.slug='schinus-molle' AND e.is_active AND e.deleted_at IS NULL
                """, Integer.class)).isPositive();
        jdbc.update("UPDATE species SET is_active=FALSE WHERE slug='schinus-molle'");

        String export = mockMvc.perform(get("/api/v1/green-inventory/species/export.csv"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(export).contains("Schinus molle").doesNotContain("is_active", "deleted_at");

        String currentName = jdbc.queryForObject("SELECT common_name FROM species WHERE slug='schinus-molle'", String.class);
        long batch = batchIdOf(preview("""
                nombre_cientifico;tipo_vegetacion
                Schinus molle;Arbusto
                """).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toUpdate").value(0))
                .andExpect(jsonPath("$.data.skippedInactiveSpecies[0].scientificName").value("Schinus molle"))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updated").value(0))
                .andExpect(jsonPath("$.data.omittedInactiveSpecies").value(1));

        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug='schinus-molle'", Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM species WHERE slug='schinus-molle'", Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug='schinus-molle'", String.class)).isEqualTo(currentName);
    }

    @Test
    void csvCanReuseADeletedScientificNameButNeverItsHistoricalIdOrSlug() throws Exception {
        Long oldId = jdbc.queryForObject("""
                INSERT INTO species (scientific_name, slug, species_type_item_id, is_active, deleted_at)
                VALUES ('Rosa repetita', 'rosa-repetita',
                        (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                          WHERE ct.code='SPECIES_TYPE' AND ci.code='TREE'), TRUE, NULL)
                RETURNING id
                """, Long.class);
        jdbc.update("UPDATE species SET is_active=FALSE,deleted_at=CURRENT_TIMESTAMP WHERE id=?", oldId);

        String csv = "nombre_cientifico;tipo_vegetacion\nRosa repetita;Árbol\n";
        long batch = batchIdOf(preview(csv).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toCreate").value(1))
                .andExpect(jsonPath("$.data.toUpdate").value(0))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdCodes[0]").value("rosa-repetita-2"));

        Long newId = jdbc.queryForObject("SELECT id FROM species WHERE slug='rosa-repetita-2'", Long.class);
        assertThat(newId).isGreaterThan(oldId);
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id=?", Boolean.class, newId)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species WHERE scientific_name='Rosa repetita'", Integer.class))
                .isEqualTo(2);
        mockMvc.perform(get("/api/v1/green-inventory/species/rosa-repetita")).andExpect(status().isNotFound());
    }

    @Test
    void nonCriticalSpeciesWithoutAveragesBlocksTheLoadAndReportsBothColumns() throws Exception {
        String csv = """
                nombre_cientifico;tipo_vegetacion;es_critica
                Plumbago auriculata;Arbusto;no
                """;

        preview(csv)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(1))
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues", hasSize(2)))
                .andExpect(jsonPath("$.data.issues[0].column").value("altura_promedio_m"))
                .andExpect(jsonPath("$.data.issues[1].column").value("radio_copa_promedio_m"));
    }

    @Test
    void repeatedSpeciesMissingSourceAndInvalidPhotoAreReportedTogether() throws Exception {
        String csv = """
                nombre_cientifico;tipo_vegetacion;altura_promedio_m;fuente_altura;foto
                Tabebuia rosea;Árbol;8.0;;foto_faltante.jpg
                tabebuia rosea;Árbol;;;
                Lantana camara;;;;http://localhost:8080/internal
                """;

        long batch = batchIdOf(preview(csv)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(3))
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues", hasSize(5))));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species WHERE scientific_name = 'Lantana camara' AND deleted_at IS NULL",
                Integer.class)).isZero();
    }

    @Test
    void anEmptyOrMalformedQuotedCsvIsRejectedBeforeCreatingABatch() throws Exception {
        mockMvc.perform(multipart("/api/v1/imports/species/preview")
                        .file(new MockMultipartFile("file", "empty.csv", "text/csv", new byte[0])))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/imports/species/preview")
                        .file(new MockMultipartFile("file", "broken.csv", "text/csv",
                                "nombre_cientifico;tipo_vegetacion\n\"Schinus molle;Árbol\n".getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aCorruptPhotosZipIsRejectedEvenWhenTheSpeciesRowHasNoPhoto() throws Exception {
        String csv = "nombre_cientifico;tipo_vegetacion\nNectandra testiana;Árbol\n";
        mockMvc.perform(multipart("/api/v1/imports/species/preview")
                        .file(new MockMultipartFile("file", "especies.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "fotos.zip", "application/zip",
                                "not a zip".getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(multipart("/api/v1/imports/species/preview")
                        .file(new MockMultipartFile("file", "especies.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "empty.zip", "application/zip", new byte[0])))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anInvalidPhotoImageWarnsButDoesNotDiscardTheSpeciesRow() throws Exception {
        String csv = "nombre_cientifico;tipo_vegetacion;foto\nNectandra testiana;Árbol;fotos/foto.jpg\n";
        byte[] zipBytes = zipWith("foto.jpg", "not an image".getBytes(StandardCharsets.UTF_8));
        long batch = batchIdOf(mockMvc.perform(multipart("/api/v1/imports/species/preview")
                        .file(new MockMultipartFile("file", "especies.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("photos", "fotos.zip", "application/zip", zipBytes)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(1))
                .andExpect(jsonPath("$.data.photoWarnings", hasSize(1)));
    }

    private static byte[] zipWith(String name, byte[] contents) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("fotos/" + name));
            zip.write(contents);
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    @Test
    void exportsSpeciesCatalogAndReloadsWithoutErrors() throws Exception {
        String exported = mockMvc.perform(get("/api/v1/green-inventory/species/export.csv"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        int visibleSpecies = jdbc.queryForObject("""
                SELECT count(*) FROM species s
                 WHERE s.deleted_at IS NULL AND (s.is_active OR EXISTS (
                       SELECT 1 FROM green_elements e WHERE e.species_id=s.id AND e.is_active AND e.deleted_at IS NULL))
                """, Integer.class);

        assertThat(exported).startsWith(
                "\uFEFFnombre_cientifico;nombre_comun;nombres_alternativos;familia;tipo_vegetacion;origen;descripcion;notas_cuidado;"
                        + "es_critica;altura_promedio_m;fuente_altura;radio_copa_promedio_m;fuente_radio_copa;usa_altura_fuste;usa_dap;foto;slug;ejemplares");
        assertThat(exported).contains("Schinus molle");

        preview(exported)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.issues", hasSize(0)))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.toUpdate").value(visibleSpecies))
                .andExpect(jsonPath("$.data.canConfirm").value(true));
    }

    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorCannotImportOrExportSpeciesCsv() throws Exception {
        preview("nombre_cientifico;tipo_vegetacion\nTabebuia rosea;Árbol\n").andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/green-inventory/species/export.csv")).andExpect(status().isForbidden());
    }

    @Test
    void importingAnInactiveSpeciesSkipsItWithoutEditingOrChangingItsState() throws Exception {
        jdbc.update("UPDATE species SET is_active = FALSE WHERE slug = 'schinus-molle'");
        String currentName = jdbc.queryForObject("SELECT common_name FROM species WHERE slug='schinus-molle'", String.class);
        long batch = batchIdOf(preview("nombre_cientifico;nombre_comun\nSchinus molle;Molle actualizado\n")
                .andExpect(jsonPath("$.data.toUpdate").value(0))
                .andExpect(jsonPath("$.data.toCreate").value(0))
                .andExpect(jsonPath("$.data.skippedInactiveSpecies", hasSize(1)))
                .andExpect(jsonPath("$.data.issues", hasSize(0)))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.omittedInactiveSpecies").value(1));

        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug = 'schinus-molle'", Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isEqualTo(currentName);
    }

    @Test
    void aSpeciesDeactivatedAfterPreviewCannotBeEditedByImport() throws Exception {
        String currentName = jdbc.queryForObject("SELECT common_name FROM species WHERE slug='schinus-molle'", String.class);
        long batch = batchIdOf(preview("nombre_cientifico;nombre_comun\nSchinus molle;Actualizado tras baja\n")
                .andExpect(jsonPath("$.data.toUpdate").value(1))
                .andExpect(jsonPath("$.data.canConfirm").value(true)));
        jdbc.update("UPDATE species SET is_active = FALSE, updated_at = updated_at + INTERVAL '1 second' "
                + "WHERE slug = 'schinus-molle'");

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isUnprocessableEntity());

        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE slug = 'schinus-molle'", Boolean.class))
                .isFalse();
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isEqualTo(currentName);
    }

    @Test
    void retryingAConfirmedSpeciesImportReturnsTheSavedResult() throws Exception {
        long batch = batchIdOf(preview("nombre_cientifico;nombre_comun\nSchinus molle;Molle idempotente\n")
                .andExpect(jsonPath("$.data.toUpdate").value(1)));
        String firstResult = mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updated").value(1))
                .andReturn().getResponse().getContentAsString();

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(content().json(firstResult));

        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isEqualTo("Molle idempotente");
    }

    @Test
    void anExpiredSpeciesPreviewCannotBeConfirmedAndWritesNothing() throws Exception {
        long batch = batchIdOf(preview("nombre_cientifico;nombre_comun\nSchinus molle;No debe guardarse\n"));
        jdbc.update("UPDATE import_batches SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = ?", batch);

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm"))
                .andExpect(status().isUnprocessableEntity());

        assertThat(jdbc.queryForObject("SELECT status FROM import_batches WHERE id = ?", String.class, batch))
                .isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isNotEqualTo("No debe guardarse");
    }

    @Test
    void aSpeciesChangedAfterPreviewIsNotSilentlyOverwritten() throws Exception {
        long batch = batchIdOf(preview("nombre_cientifico;nombre_comun\nSchinus molle;Valor del CSV\n")
                .andExpect(jsonPath("$.data.toUpdate").value(1)));
        jdbc.update("UPDATE species SET common_name = 'Cambio manual posterior', updated_at = updated_at + INTERVAL '1 second' "
                + "WHERE slug = 'schinus-molle'");

        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'schinus-molle'", String.class))
                .isEqualTo("Cambio manual posterior");
    }
}
