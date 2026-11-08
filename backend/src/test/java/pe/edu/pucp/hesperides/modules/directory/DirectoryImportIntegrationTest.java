package pe.edu.pucp.hesperides.modules.directory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
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

/** Registro masivo del Directorio: plantilla, vista previa y confirmación de todo o nada. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
class DirectoryImportIntegrationTest {

    private static final String IMPORTS = "/api/v1/directory/imports";
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

    private ResultActions upload(String kind, String step, String csv) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", kind + ".csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));
        return mockMvc.perform(multipart(IMPORTS + "/" + kind + "/" + step).file(file));
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
        void eachKindHasATemplateWithItsColumns() throws Exception {
            mockMvc.perform(get(IMPORTS + "/templates/organizaciones")).andExpect(status().isOk())
                    .andExpect(content().string(containsString("nombre;tipo;ruc;telefono;otros_nombres")));
            mockMvc.perform(get(IMPORTS + "/templates/contactos")).andExpect(status().isOk())
                    .andExpect(content().string(containsString("nombre;organizaciones;anexo;celular;correo")));
        }

        @Test
        void anUnknownKindIsNotFound() throws Exception {
            mockMvc.perform(get(IMPORTS + "/templates/especies")).andExpect(status().isNotFound());
        }
    }

    @Nested
    class Organizations {

        @Test
        void thePreviewSaysWhatWouldHappenAndSavesNothing() throws Exception {
            existingOrganization("DAF", null);

            upload("organizaciones", "preview", ORG_HEADER
                    + "OIE;Unidad PUCP;;6262000;Oficina de Intercambio|OIE PUCP\n"
                    + "daf;unidad pucp;;;\n"
                    + "Jardines del Sur SAC;Empresa externa;20123456789;;\n")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.rows[*].action", contains("CREATE", "SKIP", "CREATE")))
                    .andExpect(jsonPath("$.data.creates").value(2))
                    .andExpect(jsonPath("$.data.skips").value(1))
                    .andExpect(jsonPath("$.data.errors").value(0));

            assertThat(organizations()).isEqualTo(1);
        }

        @Test
        void confirmingCreatesTheNewOnesWithTheirAliases() throws Exception {
            upload("organizaciones", "confirm", ORG_HEADER
                    + "OIE;Unidad PUCP;;6262000;Oficina de Intercambio|OIE PUCP\n"
                    + "Jardines del Sur SAC;EXTERNAL_COMPANY;20123456789;;\n")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.created").value(2))
                    .andExpect(jsonPath("$.data.skipped").value(0));

            mockMvc.perform(get("/api/v1/directory/organizations").param("q", "oficina de intercambio"))
                    .andExpect(jsonPath("$.data.items[0].name").value("OIE"));
        }

        @Test
        void rowErrorsSayTheLineColumnAndReason() throws Exception {
            upload("organizaciones", "preview", ORG_HEADER
                    + ";Unidad PUCP;;;\n"
                    + "Facultad de Derecho;Ministerio;;;\n"
                    + "Facultad de Letras;Unidad PUCP;20123456789;;\n"
                    + "Jardines SAC;Empresa externa;2012345678;;\n")
                    .andExpect(jsonPath("$.data.errors").value(4))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].line").value(2))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("nombre"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("REQUIRED"))
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("UNKNOWN_TYPE"))
                    .andExpect(jsonPath("$.data.rows[2].issues[0].code").value("RUC_NOT_FOR_UNIT"))
                    .andExpect(jsonPath("$.data.rows[3].issues[0].code").value("RUC_FORMAT"));
        }

        @Test
        void aNameRepeatedInTheFileIsAnError() throws Exception {
            upload("organizaciones", "preview", ORG_HEADER + "OIE;Unidad PUCP;;;\noie;Unidad PUCP;;;\n")
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("DUPLICATED_IN_FILE"));
        }

        @Test
        void aNameUsedAsAnotherOrganizationsAliasIsAnError() throws Exception {
            existingOrganization("Estudios Generales Ciencias", "EEGGCC");

            upload("organizaciones", "preview", ORG_HEADER + "EEGGCC;Unidad PUCP;;;\n")
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("NAME_TAKEN"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].detail").value("Estudios Generales Ciencias"));
        }

        @Test
        void withAnyErrorNothingIsSaved() throws Exception {
            upload("organizaciones", "confirm", ORG_HEADER + "OIE;Unidad PUCP;;;\nJardines SAC;Empresa externa;123;;\n")
                    .andExpect(status().isUnprocessableEntity());

            assertThat(organizations()).isZero();
        }

        @Test
        void aFileWithoutTheRequiredColumnsIsRejected() throws Exception {
            upload("organizaciones", "preview", "razon_social;ruc\nOIE;\n").andExpect(status().isBadRequest());
        }
    }

    @Nested
    class Contacts {

        @Test
        void contactsJoinTheirOrganizationsByNameAliasOrCode() throws Exception {
            existingOrganization("OIE", null);
            existingOrganization("Estudios Generales Ciencias", "EEGGCC");

            upload("contactos", "confirm", CONTACT_HEADER
                    + "Juan Diego Villasante;OIE|eeggcc;45 49;987 654 321;jdv@pucp.edu.pe\n")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.created").value(1));

            mockMvc.perform(get("/api/v1/directory/contacts").param("q", "villasante"))
                    .andExpect(jsonPath("$.data.items[0].organizations.length()").value(2))
                    .andExpect(jsonPath("$.data.items[0].extension").value("4549"));
        }

        @Test
        void aContactAlreadyInThatOrganizationIsSkipped() throws Exception {
            existingOrganization("OIE", null);
            upload("contactos", "confirm", CONTACT_HEADER + "Juan Diego Villasante;OIE;;;\n").andExpect(status().isOk());

            upload("contactos", "preview", CONTACT_HEADER + "juan diego villasante;OIE;;;\n")
                    .andExpect(jsonPath("$.data.rows[0].action").value("SKIP"));
        }

        @Test
        void unknownOrganizationsAndBadPhonesAreErrors() throws Exception {
            existingOrganization("OIE", null);

            upload("contactos", "preview", CONTACT_HEADER
                    + "Ana Torres;Facultad Inexistente;;;\n"
                    + "Luis Ramos;OIE;454;887654321;no-es-correo\n"
                    + "Sin Organizacion;;;;\n")
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("UNKNOWN_ORGANIZATION"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].detail").value("Facultad Inexistente"))
                    .andExpect(jsonPath("$.data.rows[1].issues[*].code", contains("EXTENSION_FORMAT", "MOBILE_FORMAT",
                            "EMAIL_FORMAT")))
                    .andExpect(jsonPath("$.data.rows[2].issues[0].code").value("REQUIRED"));

            assertThat(contacts()).isZero();
        }
    }

    @Nested
    class Permissions {

        @Test
        @WithMockUser(username = "capataz@pucp.edu.pe", authorities = "SUPERVISOR")
        void aForemanCannotImport() throws Exception {
            upload("organizaciones", "preview", ORG_HEADER + "OIE;Unidad PUCP;;;\n").andExpect(status().isForbidden());
            upload("organizaciones", "confirm", ORG_HEADER + "OIE;Unidad PUCP;;;\n").andExpect(status().isForbidden());
        }
    }
}
