package pe.edu.pucp.hesperides.modules.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Recorre el flujo completo contra PostgreSQL real, sin mocks. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private static final String LOGIN_BODY = """
            {"email": "admin@pucp.edu.pe", "password": "Hesperides2026"}
            """;

    @Test
    void theSeededAdminCanLogInAndReadItsOwnProfile() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role.code").value("ADMIN"))
                .andReturn();

        String accessToken = readAccessToken(login);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("admin@pucp.edu.pe"));
    }

    @Test
    void aProtectedEndpointWithoutATokenReturns401WithTheStandardEnvelope() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    void noResponseEverContainsThePasswordHash() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andReturn();

        String body = login.getResponse().getContentAsString();
        assertThat(body).doesNotContain("passwordHash").doesNotContain("password_hash").doesNotContain("$2a$");
    }

    @Test
    void aRotatedRefreshTokenCannotBeUsedTwice() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andReturn();

        String refreshToken = objectMapper.readTree(login.getResponse().getContentAsString())
                .path("data").path("refreshToken").asString();
        String refreshBody = objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken));

        // Primer uso: válido, rota el token.
        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isOk());

        // Segundo uso del mismo token: reuso detectado, sesión cerrada.
        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sixFailedAttemptsInARowGet429NotAnother401() throws Exception {
        String wrongPassword = """
                {"email": "bloqueo@pucp.edu.pe", "password": "incorrecta"}
                """;

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON).content(wrongPassword))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(wrongPassword))
                .andExpect(status().isTooManyRequests());
    }

    private String readAccessToken(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asString();
    }
}
