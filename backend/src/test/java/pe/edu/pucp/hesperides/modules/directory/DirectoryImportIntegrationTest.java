package pe.edu.pucp.hesperides.modules.directory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
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

/**
 * Registro masivo del Directorio en el ciclo común de cargas (SPEC-106 §4.2):
 * la vista previa abre un lote, y la confirmación escribe lo revisado.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
class DirectoryImportIntegrationTest {

    private static final String IMPORTS = "/api/v1/imports";
    private static final String ORG_HEADER = "nombre;tipo;ruc;telefono;otros_nombres\n";
    private static final String CONTACT_HEADER = "nombre;organizaciones;anexo;celular;correo\n";

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

    /** El lote recuerda quién lo abrió: la sesión de prueba necesita su cuenta. */
    @BeforeEach
    void coordinatorAccount() {
        jdbc.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT 'coordinador@pucp.edu.pe', 'x', 'Coordinación', 'Prueba', i.id
                  FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ROLE' AND i.code = 'COORDINADOR'""");
    }

    private ResultActions preview(String kind, String csv) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", kind + ".csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));
        return mockMvc.perform(multipart(IMPORTS + "/" + kind + "/preview").file(file));
    }

    private static long batchIdOf(ResultActions preview) throws Exception {
        return Long.parseLong(preview.andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"batchId\":(\\d+).*", "$1"));
    }

    private ResultActions confirm(long batchId) throws Exception {
        return mockMvc.perform(post(IMPORTS + "/" + batchId + "/confirm"));
    }

    private ResultActions previewAndConfirm(String kind, String csv) throws Exception {
        return confirm(batchIdOf(preview(kind, csv).andExpect(status().isOk())));
    }

    private int organizations() {
        return jdbc.queryForObject("SELECT count(*) FROM organizations WHERE deleted_at IS NULL", Integer.class);
    }

    private int contacts() {
        return jdbc.queryForObject("SELECT count(*) FROM contacts WHERE deleted_at IS NULL", Integer.class);
    }

    private void existingOrganization(String name, String alias) throws Exception {
        String aliases = alias == null ? "[]" : "[\"" + alias + "\"]";
        mockMvc.perform(post("/api/v1/directory/organizations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\",\"typeCode\":\"PUCP_UNIT\",\"aliases\":" + aliases + "}"))
                .andExpect(status().isCreated());
    }

    @Nested
    class Templates {

        @Test
        void theTemplatesAreTheDocumentedOnes() throws Exception {
            for (String[] t : new String[][]{{"organizations", "organizaciones.csv"}, {"contacts", "contactos.csv"}}) {
                byte[] documented = Files.readAllBytes(Path.of("src", "main", "resources", "imports", "templates", t[1]));
                mockMvc.perform(get(IMPORTS + "/templates/" + t[0])).andExpect(status().isOk())
                        .andExpect(content().bytes(documented));
            }
        }
    }

    @Nested
    class Organizations {

        @Test
        void thePreviewOpensABatchAndSavesNothing() throws Exception {
            existingOrganization("DAF", null);

            preview("organizations", ORG_HEADER
                    + "OIE;Unidad PUCP;;6262000;Oficina de Intercambio|OIE PUCP\n"
                    + "daf;unidad pucp;;;\n"
                    + "Jardines del Sur SAC;Empresa externa;20123456789;;\n")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.batchId").isNumber())
                    .andExpect(jsonPath("$.data.kind").value("organizations"))
                    .andExpect(jsonPath("$.data.rows[*].action", contains("CREATE", "SKIP", "CREATE")))
                    .andExpect(jsonPath("$.data.totalRows").value(3))
                    .andExpect(jsonPath("$.data.toCreate").value(2))
                    .andExpect(jsonPath("$.data.toSkip").value(1))
                    .andExpect(jsonPath("$.data.errors").value(0))
                    .andExpect(jsonPath("$.data.canConfirm").value(true));

            assertThat(organizations()).isEqualTo(1);
        }

        @Test
        void confirmingCreatesTheReviewedRowsAndRemembersTheirBatch() throws Exception {
            long batch = batchIdOf(preview("organizations", ORG_HEADER
                    + "OIE;Unidad PUCP;;6262000;Oficina de Intercambio|OIE PUCP\n"
                    + "Jardines del Sur SAC;EXTERNAL_COMPANY;20123456789;;\n"));

            confirm(batch).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.batchId").value(batch))
                    .andExpect(jsonPath("$.data.created").value(2))
                    .andExpect(jsonPath("$.data.skipped").value(0))
                    .andExpect(jsonPath("$.data.createdCodes[0]", matchesPattern("ORG-\\d{4}")));

            mockMvc.perform(get("/api/v1/directory/organizations").param("q", "oficina de intercambio"))
                    .andExpect(jsonPath("$.data.items[0].name").value("OIE"));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM organizations WHERE import_batch_id = ?",
                    Integer.class, batch)).isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT status FROM import_batches WHERE id = ?", String.class, batch))
                    .isEqualTo("CONFIRMED");
        }

        @Test
        void aBatchIsConfirmedOnlyOnce() throws Exception {
            long batch = batchIdOf(preview("organizations", ORG_HEADER + "OIE;Unidad PUCP;;;\n"));
            confirm(batch).andExpect(status().isOk());

            confirm(batch).andExpect(status().isUnprocessableEntity());
            assertThat(organizations()).isEqualTo(1);
        }

        @Test
        @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
        void onlyWhoUploadedTheFileConfirmsIt() throws Exception {
            long batch = jdbc.queryForObject("""
                    INSERT INTO import_batches (kind, file_name, created_by_user_id, report, expires_at)
                    VALUES ('organizations', 'x.csv', (SELECT id FROM users WHERE email = 'coordinador@pucp.edu.pe'),
                            '{"rows":[]}'::jsonb, CURRENT_TIMESTAMP + INTERVAL '1 hour') RETURNING id""", Long.class);

            confirm(batch).andExpect(status().isUnprocessableEntity());
        }

        @Test
        void rowErrorsSayTheLineColumnAndReason() throws Exception {
            preview("organizations", ORG_HEADER
                    + ";Unidad PUCP;;;\n"
                    + "Facultad de Derecho;Ministerio;;;\n"
                    + "Facultad de Letras;Unidad PUCP;20123456789;;\n"
                    + "Jardines SAC;Empresa externa;2012345678;;\n")
                    .andExpect(jsonPath("$.data.errors").value(4))
                    .andExpect(jsonPath("$.data.canConfirm").value(false))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].line").value(2))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("nombre"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("REQUIRED"))
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("UNKNOWN_TYPE"))
                    .andExpect(jsonPath("$.data.rows[2].issues[0].code").value("RUC_NOT_FOR_UNIT"))
                    .andExpect(jsonPath("$.data.rows[3].issues[0].code").value("RUC_FORMAT"));
        }

        @Test
        void aNameRepeatedInTheFileIsAnError() throws Exception {
            preview("organizations", ORG_HEADER + "OIE;Unidad PUCP;;;\noie;Unidad PUCP;;;\n")
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("DUPLICATED_IN_FILE"));
        }

        @Test
        void aNameUsedAsAnotherOrganizationsAliasIsAnError() throws Exception {
            existingOrganization("Estudios Generales Ciencias", "EEGGCC");

            preview("organizations", ORG_HEADER + "EEGGCC;Unidad PUCP;;;\n")
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("NAME_TAKEN"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].detail").value("Estudios Generales Ciencias"));
        }

        @Test
        void withAnyErrorNothingIsSaved() throws Exception {
            previewAndConfirm("organizations", ORG_HEADER + "OIE;Unidad PUCP;;;\nJardines SAC;Empresa externa;123;;\n")
                    .andExpect(status().isUnprocessableEntity());

            assertThat(organizations()).isZero();
        }

        @Test
        void aFileWithoutTheRequiredColumnsIsRejected() throws Exception {
            preview("organizations", "razon_social;ruc\nOIE;\n").andExpect(status().isBadRequest());
        }

        @Test
        void aFileWithAnUnknownColumnIsRejected() throws Exception {
            preview("organizations", "nombre;tipo;ruc;telefono;otros_nombres;razon_social\nOIE;Unidad PUCP;;;;\n")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "The file has unknown columns: razon_social. Check the spelling against the standard"));
        }
    }

    @Nested
    class Contacts {

        @Test
        void contactsJoinTheirOrganizationsByNameAliasOrCodeAndRememberTheirBatch() throws Exception {
            existingOrganization("OIE", null);
            existingOrganization("Estudios Generales Ciencias", "EEGGCC");

            long batch = batchIdOf(preview("contacts", CONTACT_HEADER
                    + "Juan Diego Villasante;OIE|eeggcc;45 49;987 654 321;jdv@pucp.edu.pe\n"));
            confirm(batch).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.created").value(1))
                    .andExpect(jsonPath("$.data.createdCodes[0]", matchesPattern("CON-\\d{4}")));

            mockMvc.perform(get("/api/v1/directory/contacts").param("q", "villasante"))
                    .andExpect(jsonPath("$.data.items[0].organizations.length()").value(2))
                    .andExpect(jsonPath("$.data.items[0].extension").value("4549"));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM contacts WHERE import_batch_id = ?",
                    Integer.class, batch)).isEqualTo(1);
        }

        @Test
        void aContactAlreadyInThatOrganizationIsShownAsSkipped() throws Exception {
            existingOrganization("OIE", null);
            previewAndConfirm("contacts", CONTACT_HEADER + "Juan Diego Villasante;OIE;;;\n").andExpect(status().isOk());

            preview("contacts", CONTACT_HEADER + "juan diego villasante;OIE;;;\n")
                    .andExpect(jsonPath("$.data.rows[0].action").value("SKIP"))
                    .andExpect(jsonPath("$.data.toSkip").value(1));
        }

        @Test
        void badPhonesEmailsAndMissingOrganizationsAreErrors() throws Exception {
            existingOrganization("OIE", null);

            preview("contacts", CONTACT_HEADER
                    + "Luis Ramos;OIE;454;887654321;no-es-correo\n"
                    + "Sin Organizacion;;;;\n")
                    .andExpect(jsonPath("$.data.rows[0].issues[*].code", contains("EXTENSION_FORMAT", "MOBILE_FORMAT",
                            "EMAIL_FORMAT")))
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("REQUIRED"))
                    .andExpect(jsonPath("$.data.canConfirm").value(false));

            assertThat(contacts()).isZero();
        }

        @Test
        void anUnknownOrganizationOmitsItsRowsAndCountsThemWithoutBlockingTheFile() throws Exception {
            existingOrganization("OIE", null);

            preview("contacts", CONTACT_HEADER
                    + "Ana Torres;Facultad Inexistente;;;\n"
                    + "Luis Ramos;OIE;;;\n"
                    + "Rosa Díaz;facultad inexistente;;;\n")
                    .andExpect(jsonPath("$.data.rows[*].action", contains("OMIT", "CREATE", "OMIT")))
                    .andExpect(jsonPath("$.data.rows[0].issues").isEmpty())
                    .andExpect(jsonPath("$.data.rows[0].missing[0]").value("Facultad Inexistente"))
                    .andExpect(jsonPath("$.data.toOmit").value(2))
                    .andExpect(jsonPath("$.data.missingOrganizations[0].name").value("Facultad Inexistente"))
                    .andExpect(jsonPath("$.data.missingOrganizations[0].rows").value(2))
                    .andExpect(jsonPath("$.data.canConfirm").value(true));
        }

        @Test
        void confirmingCreatesTheOthersAndReportsTheOmittedOnes() throws Exception {
            existingOrganization("OIE", null);

            previewAndConfirm("contacts", CONTACT_HEADER + "Ana Torres;Facultad Inexistente;;;\nLuis Ramos;OIE;;;\n")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.created").value(1))
                    .andExpect(jsonPath("$.data.omitted").value(1))
                    .andExpect(jsonPath("$.data.missingOrganizations[0].name").value("Facultad Inexistente"));

            assertThat(contacts()).isEqualTo(1);
        }

        @Test
        void aContactIsNeverCreatedWithOnlyPartOfItsOrganizations() throws Exception {
            existingOrganization("OIE", null);

            previewAndConfirm("contacts", CONTACT_HEADER + "Ana Torres;OIE|Facultad Inexistente;;;\n")
                    .andExpect(jsonPath("$.data.created").value(0))
                    .andExpect(jsonPath("$.data.omitted").value(1));

            assertThat(contacts()).isZero();
        }

        @Test
        void anErrorWeighsMoreThanAMissingOrganization() throws Exception {
            preview("contacts", CONTACT_HEADER + "Ana Torres;Facultad Inexistente;;;no-es-correo\n")
                    .andExpect(jsonPath("$.data.rows[0].action").value("ERROR"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("EMAIL_FORMAT"))
                    .andExpect(jsonPath("$.data.canConfirm").value(false));
        }
    }

    @Nested
    class Permissions {

        @Test
        @WithMockUser(username = "capataz@pucp.edu.pe", authorities = "SUPERVISOR")
        void aForemanCannotImport() throws Exception {
            preview("organizations", ORG_HEADER + "OIE;Unidad PUCP;;;\n").andExpect(status().isForbidden());
            confirm(1).andExpect(status().isForbidden());
        }
    }
}
