package pe.edu.pucp.hesperides.modules.users;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recorre el flujo completo contra PostgreSQL y SMTP reales, sin mocks. Es lo
 * único que prueba que las piezas encajan: una Specification mal construida, un
 * @Transactional mal puesto o un CHECK que rechaza lo que el enum produce solo
 * se ven aquí.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UsersIntegrationTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP);

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // El puerto se fija al valor estático de ServerSetupTest.SMTP (3025) y no
        // con greenMail.getSmtp(): @DynamicPropertySource se evalúa antes de que
        // la extensión arranque el servidor, así que ahí getSmtp() es null.
        registry.add("spring.mail.port", () -> ServerSetupTest.SMTP.getPort());
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;

    private String createBody(String email) {
        return """
                {"email":"%s","firstName":"María","lastName":"García",
                 "roleCode":"OPERARIO","initialPassword":"ClaveValida123"}
                """.formatted(email);
    }

    private Long idOf(String email) {
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    // CA-01
    @Test
    @WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
    void onlyAnAdminCanCreateUsers() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody("x@pucp.edu.pe")))
                .andExpect(status().isForbidden());
    }

    // CA-02, primera mitad
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void creatingAUserSendsTheEmailAndForcesTheChange() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("nueva@pucp.edu.pe")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mustChangePassword").value(true))
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"));

        assertThat(greenMail.getReceivedMessages()).isNotEmpty();
        String body = GreenMailUtil.getBody(greenMail.getReceivedMessages()[0]);
        assertThat(body).contains("ClaveValida123").contains("nueva@pucp.edu.pe");
    }

    // CA-05
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void theLastAdminCannotBeDeactivatedNorDemoted() throws Exception {
        Long adminId = idOf("admin@pucp.edu.pe");

        // Es el unico ADMIN y ademas quien ejecuta: falla por autodesactivacion.
        mockMvc.perform(post("/api/v1/users/" + adminId + "/deactivate"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("You cannot deactivate your own account"));

        mockMvc.perform(put("/api/v1/users/" + adminId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@pucp.edu.pe","firstName":"Administrador",
                                 "lastName":"Hesperides","roleCode":"OPERARIO"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message")
                        .value("Cannot change the role of the last active administrator"));
    }

    // CA-04
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void deactivatingAUserTurnsTheAccountOff() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("baja@pucp.edu.pe")));
        Long id = idOf("baja@pucp.edu.pe");

        mockMvc.perform(post("/api/v1/users/" + id + "/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        // Se comprueba leyendo por la API y no con SQL directo: el test corre en
        // la misma transaccion que el servicio, asi que un SELECT de JdbcTemplate
        // puede no ver lo que Hibernate aun tiene en su sesion sin volcar.
        mockMvc.perform(get("/api/v1/users/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        // Idempotente: repetir no falla.
        mockMvc.perform(post("/api/v1/users/" + id + "/deactivate"))
                .andExpect(status().isOk());
    }

    // CA-06
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void theListingAppliesEveryFilter() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("filtro@pucp.edu.pe")));

        mockMvc.perform(get("/api/v1/users").param("search", "garcia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].lastName").value("García"));

        mockMvc.perform(get("/api/v1/users").param("roleCode", "ADMIN"))
                .andExpect(jsonPath("$.data.content[0].role.code").value("ADMIN"));

        // Sin isActive no aparece ningun desactivado.
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(jsonPath("$.data.content[?(@.isActive == false)]").isEmpty());
    }

    // CA-08
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void noResponseEverExposesThePasswordHash() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody("hash@pucp.edu.pe")))
                .andReturn();
        MvcResult listed = mockMvc.perform(get("/api/v1/users")).andReturn();

        for (MvcResult result : new MvcResult[] {created, listed}) {
            assertThat(result.getResponse().getContentAsString())
                    .doesNotContain("passwordHash")
                    .doesNotContain("password_hash")
                    .doesNotContain("$2a$");
        }
    }

    // CA-09
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void anAdminCannotSetSomeoneElsePassword() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("fija@pucp.edu.pe")));
        Long id = idOf("fija@pucp.edu.pe");
        String hashBefore = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE id = ?", String.class, id);

        // Un campo "password" extra en el body se ignora.
        mockMvc.perform(put("/api/v1/users/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"fija@pucp.edu.pe","firstName":"María","lastName":"García",
                                 "roleCode":"OPERARIO","password":"InyectadaPorElAdmin1"}
                                """))
                .andExpect(status().isOk());

        String hashAfter = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE id = ?", String.class, id);
        assertThat(hashAfter).isEqualTo(hashBefore);
    }

    // CA-03: el alta sobrevive a un fallo de entrega.
    //
    // El fallo de SMTP se ejercita en CredentialDeliveryServiceTest, que apunta a
    // un puerto muerto. Aqui se comprueba el otro lado del contrato: que una
    // cuenta en PENDING_DELIVERY existe de verdad en la base y se puede recuperar
    // con resend-credentials, que es lo que el administrador hara.
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void resendingCredentialsRegeneratesThePasswordAndSendsANewEmail() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("rebote@pucp.edu.pe")));
        Long id = idOf("rebote@pucp.edu.pe");
        int emailsAfterCreation = greenMail.getReceivedMessages().length;

        mockMvc.perform(post("/api/v1/users/" + id + "/resend-credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.message").value("Credentials sent successfully"));

        // Sale un correo nuevo, y la clave que lleva no es la que escribio el
        // administrador al crear la cuenta: se regenero.
        assertThat(greenMail.getReceivedMessages()).hasSizeGreaterThan(emailsAfterCreation);
        String lastBody = GreenMailUtil.getBody(
                greenMail.getReceivedMessages()[greenMail.getReceivedMessages().length - 1]);
        assertThat(lastBody).doesNotContain("ClaveValida123");
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void markingCredentialsDeliveredRejectsAnAccountThatIsNotPending() throws Exception {
        // Con SMTP arriba el alta queda DELIVERED, asi que marcar la entrega no
        // procede: la accion existe solo para resolver un rebote (SPEC-100 §3).
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("manual@pucp.edu.pe")));
        Long id = idOf("manual@pucp.edu.pe");

        mockMvc.perform(post("/api/v1/users/" + id + "/mark-credentials-delivered"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("User credentials are not pending delivery"));
    }

    // CA-02, segunda mitad
    @Test
    @WithMockUser(username = "forzada@pucp.edu.pe", authorities = "ADMIN")
    void aPendingPasswordChangeBlocksTheRestOfTheApi() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id,
                                   must_change_password)
                VALUES ('forzada@pucp.edu.pe', '$2a$10$x', 'Ana', 'Torres',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'), TRUE)
                """);

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Password change required before using the system"));

        // /auth/me si pasa: la pantalla de cambio lo necesita.
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk());
    }

    // CA-07
    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorWithoutTeamsSeesOnlyThemselves() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES ('supervisor@pucp.edu.pe', '$2a$10$x', 'Sup', 'Visor',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'SUPERVISOR'))
                """);

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].email").value("supervisor@pucp.edu.pe"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void theListingPaginatesWithTheStableShapeTheFrontendConsumes() throws Exception {
        // Spring Data serializa Page con totalElements y number en la raiz, una
        // forma que su propia documentacion declara inestable entre versiones. El
        // tipo Page<T> de shared/types declara {content, page:{...}}, asi que sin
        // la propiedad que fija esta forma el frontend leeria undefined en el
        // paginador y TypeScript no podria advertirlo: el tipo miente.
        mockMvc.perform(get("/api/v1/users?size=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.page.size").value(1))
                .andExpect(jsonPath("$.data.page.number").value(0))
                .andExpect(jsonPath("$.data.page.totalElements").exists())
                .andExpect(jsonPath("$.data.page.totalPages").exists())
                // La forma plana no debe reaparecer: si vuelve, ambas coexisten y
                // el frontend elegiria la equivocada sin fallar.
                .andExpect(jsonPath("$.data.totalElements").doesNotExist())
                .andExpect(jsonPath("$.data.pageable").doesNotExist());
    }
}
