package pe.edu.pucp.hesperides.shared.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El navegador envía un preflight OPTIONS antes de cualquier POST a otro
 * origen. Si ese preflight no pasa, la petición real nunca sale y el cliente
 * solo ve un fallo de red — indistinguible de no tener internet.
 *
 * Estos tests existen porque ni los tests de MockMvc previos ni curl hacen
 * preflight: el fallo solo aparecía en un navegador real.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class CorsConfigTest {

    private static final String WEB_ORIGIN = "http://localhost:3000";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void preflightOnLoginIsAllowedWithoutAuthentication() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, WEB_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, WEB_ORIGIN));
    }

    @Test
    void preflightAllowsCredentialsSoTheHttpOnlyCookieCanTravel() throws Exception {
        // Sin allow-credentials el navegador descarta la cookie de refresh y la
        // sesión no sobrevive a una recarga.
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, WEB_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void actualLoginResponseCarriesTheAllowOriginHeader() throws Exception {
        // Un 200 sin este header lo bloquea el navegador igual que un error.
        mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, WEB_ORIGIN)
                        .contentType("application/json")
                        .content("{\"email\":\"admin@pucp.edu.pe\",\"password\":\"Hesperides2026\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, WEB_ORIGIN));
    }

    @Test
    void preflightOnAProtectedRouteIsAlsoAllowed() throws Exception {
        // El preflight nunca lleva credenciales: exigirlas rompería toda
        // petición autenticada desde el navegador.
        mockMvc.perform(options("/api/v1/auth/me")
                        .header(HttpHeaders.ORIGIN, WEB_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization"))
                .andExpect(status().isOk());
    }

    @Test
    void anUnknownOriginIsRejected() throws Exception {
        // La lista de origenes permitidos es cerrada: un sitio cualquiera no
        // puede llamar a esta API con las credenciales del usuario.
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, "http://sitio-malicioso.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }
}
