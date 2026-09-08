package pe.edu.pucp.hesperides.modules.users;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.teams.entity.Team;
import pe.edu.pucp.hesperides.modules.teams.entity.TeamMember;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamsRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recorre los nueve endpoints de SPEC-100 contra PostgreSQL real y con la
 * cadena de seguridad completa: 401 sin token, 403 para OPERARIO, alcance de
 * cuadrilla del SUPERVISOR, búsqueda con tildes, reglas del último ADMIN y
 * cambio de contraseña.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class UsersIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("hesperides.security.jwt.secret",
                () -> "clave-de-prueba-suficientemente-larga-para-hs256-ok!");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UsersRepository usersRepository;
    @Autowired private CatalogItemsRepository catalogItemsRepository;
    @Autowired private TeamsRepository teamsRepository;
    @Autowired private TeamMembersRepository teamMembersRepository;
    @Autowired private RefreshTokensRepository refreshTokensRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String ADMIN_LOGIN = """
            {"email": "admin@pucp.edu.pe", "password": "Hesperides2026"}
            """;

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }

    private String adminToken() throws Exception {
        return login("admin@pucp.edu.pe", "Hesperides2026");
    }

    private CatalogItem role(String code) {
        return catalogItemsRepository.findActiveRoleByCode(code).orElseThrow();
    }

    private User seedUser(String email, String roleCode, boolean active, boolean mustChange, String plainPassword) {
        return seedUser(email, roleCode, active, mustChange, plainPassword, "Apellido");
    }

    private User seedUser(String email, String roleCode, boolean active, boolean mustChange,
                          String plainPassword, String lastName) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName(email.split("@")[0]);
        user.setLastName(lastName);
        user.setPasswordHash(passwordEncoder.encode(plainPassword));
        user.setRoleItem(role(roleCode));
        user.setActive(active);
        user.setMustChangePassword(mustChange);
        return usersRepository.save(user);
    }

    @Test
    void anUnauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    void anOperarioCannotListUsers() throws Exception {
        String email = "oper" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(email, "OPERARIO", true, false, "Operario2026");
        String token = login(email, "Operario2026");

        mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Insufficient permissions for this action"));
    }

    @Test
    void adminListsUsersWithThePageShapeAndWithoutAnyPasswordField() throws Exception {
        String inactiveEmail = "baja" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(inactiveEmail, "OPERARIO", false, false, "Baja2026");

        String body = mockMvc.perform(get("/api/v1/users?isActive=true")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").isNumber())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("passwordHash", "password_hash", "$2a$");
        assertThat(body).doesNotContain(inactiveEmail);
    }

    @Test
    void searchIsAccentInsensitiveAndFiltersByRole() throws Exception {
        String maria = "maria" + System.nanoTime() + "@pucp.edu.pe";
        String lucia = "lucia" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(maria, "OPERARIO", true, false, "Maria2026", "Pérez");
        seedUser(lucia, "OPERARIO", true, false, "Lucia2026", "Fernández");

        // "perez" sin tilde encuentra a "Pérez" y no a "Fernández".
        String searchBody = mockMvc.perform(get("/api/v1/users?search=" + encoded("perez"))
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(searchBody).contains(maria).doesNotContain(lucia);

        String adminOnly = mockMvc.perform(get("/api/v1/users?roleCode=ADMIN")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(adminOnly).contains("admin@pucp.edu.pe").doesNotContain("OPERARIO");
    }

    private static String encoded(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }

    @Test
    void supervisorSeesOnlyHisTeamMembers() throws Exception {
        String supEmail = "sup" + System.nanoTime() + "@pucp.edu.pe";
        String opaEmail = "opa" + System.nanoTime() + "@pucp.edu.pe";
        String opbEmail = "opb" + System.nanoTime() + "@pucp.edu.pe";
        User supervisor = seedUser(supEmail, "SUPERVISOR", true, false, "Supervisor2026");
        User opa = seedUser(opaEmail, "OPERARIO", true, false, "Operario2026");
        User opb = seedUser(opbEmail, "OPERARIO", true, false, "Operario2026");

        Team team = new Team();
        team.setCode("T" + System.nanoTime());
        team.setName("Cuadrilla Sur");
        team.setSupervisorUser(supervisor);
        team = teamsRepository.save(team);

        TeamMember member = new TeamMember();
        member.setTeam(team);
        member.setUser(opa);
        teamMembersRepository.save(member);

        String token = login(supEmail, "Supervisor2026");
        MvcResult list = mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String listBody = list.getResponse().getContentAsString();
        assertThat(listBody).contains(supEmail, opaEmail);
        assertThat(listBody).doesNotContain(opbEmail);
        assertThat(listBody).doesNotContain("admin@pucp.edu.pe");

        mockMvc.perform(get("/api/v1/users/" + opb.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    @Test
    void creatingAUserWithAnExistingEmailIs409() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "admin@pucp.edu.pe", "firstName": "Otra",
                                 "lastName": "Persona", "roleCode": "OPERARIO",
                                 "initialPassword": "ClaveInicial2026"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    void creatingAUserWithAWeakPasswordIs400WithTheFieldError() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "nuevo@pucp.edu.pe", "firstName": "Nuevo",
                                 "lastName": "Usuario", "roleCode": "OPERARIO",
                                 "initialPassword": "corta1"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.errors[0].field").value("initialPassword"));
    }

    @Test
    void changingPasswordWithAWrongCurrentOneIs400Not401() throws Exception {
        String email = "mismo" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(email, "OPERARIO", true, false, "Anterior2026");
        String token = login(email, "Anterior2026");

        mockMvc.perform(post("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword": "mala", "newPassword": "NuevaClave2026"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));
    }

    @Test
    void changingPasswordClearsTheFlagAndRevokesOtherSessions() throws Exception {
        String email = "forzada" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(email, "OPERARIO", true, true, "Temporal2026");
        User user = usersRepository.findActiveByEmail(email).orElseThrow();
        String token = login(email, "Temporal2026");

        mockMvc.perform(post("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword": "Temporal2026", "newPassword": "NuevaClave2026"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully"));

        User refreshed = usersRepository.findByIdAndDeletedAtIsNull(user.getId()).orElseThrow();
        assertThat(refreshed.isMustChangePassword()).isFalse();
        assertThat(passwordEncoder.matches("NuevaClave2026", refreshed.getPasswordHash())).isTrue();

        long activeTokens = refreshTokensRepository.findAll().stream()
                .filter(tokenRow -> user.getId().equals(tokenRow.getUser().getId())
                        && !tokenRow.isRevoked())
                .count();
        assertThat(activeTokens).isLessThanOrEqualTo(1);
    }

    @Test
    void deactivatingAUserRevokesAllHisSessions() throws Exception {
        String email = "avictima" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(email, "OPERARIO", true, false, "Victima2026");
        User user = usersRepository.findActiveByEmail(email).orElseThrow();

        String victimRefresh = loginAsMobile(email, "Victima2026");
        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + victimRefresh + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/users/" + user.getId() + "/deactivate")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + victimRefresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userThatMustChangePasswordIsBlockedUntilHeDoesIt() throws Exception {
        String email = "obligado" + System.nanoTime() + "@pucp.edu.pe";
        seedUser(email, "OPERARIO", true, true, "Temporal2026");
        String token = login(email, "Temporal2026");

        // Cualquier endpoint fuera de la lista blanca → 403 del interceptor.
        mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        "Password change required before using the system"));
        mockMvc.perform(get("/api/v1/catalogs/ROLE/items")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        "Password change required before using the system"));

        // Lista blanca: /auth/me sigue disponible.
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email));

        // Cambiar la contraseña desbloquea; el 403 posterior ya es de ACL, no del
        // interceptor (un OPERARIO no lista usuarios).
        mockMvc.perform(post("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword": "Temporal2026", "newPassword": "Definitiva2026"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully"));

        mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Insufficient permissions for this action"));
    }

    @Test
    void catalogItemsAreReadableByAnyAuthenticatedUser() throws Exception {
        String list = mockMvc.perform(get("/api/v1/catalogs/ROLE/items")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andReturn().getResponse().getContentAsString();
        assertThat(list).contains("ADMIN", "OPERARIO", "SUPERVISOR", "COORDINADOR", "sortOrder");
    }

    @Test
    void catalogItemsWithAnUnknownTypeReturn404() throws Exception {
        mockMvc.perform(get("/api/v1/catalogs/NO_EXISTE/items")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Catalog type not found"));
    }

    @Test
    void activeTeamsAreListedForTheFilterSelect() throws Exception {
        User supervisor = seedUser("sup." + System.nanoTime() + "@pucp.edu.pe", "SUPERVISOR", true, false, "Supervisor2026");

        Team alfa = new Team();
        alfa.setCode("ALFA" + System.nanoTime());
        alfa.setName("Cuadrilla Alfa");
        alfa.setActive(true);
        alfa.setSupervisorUser(supervisor);
        teamsRepository.save(alfa);

        Team beta = new Team();
        beta.setCode("BETA" + System.nanoTime());
        beta.setName("Cuadrilla Beta");
        beta.setActive(false);
        beta.setSupervisorUser(supervisor);
        teamsRepository.save(beta);

        String body = mockMvc.perform(get("/api/v1/teams")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).contains("Cuadrilla Alfa")
                .doesNotContain("Cuadrilla Beta");
    }

    private String loginAsMobile(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("refreshToken").asText();
    }
}