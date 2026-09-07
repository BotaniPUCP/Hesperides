package pe.edu.pucp.hesperides.modules.auth.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.service.AuthService;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        GlobalExceptionHandler.class, RefreshTokenCookieFactory.class})
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean private AuthService authService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    private AuthService.LoginResult sampleResult() {
        UserResponse user = new UserResponse(1L, "ana@pucp.edu.pe", "Ana", "Torres", "Ana Torres",
                new RoleResponse(2L, "COORDINADOR", "Coordinador"), true, null);
        return new AuthService.LoginResult("access-token", "refresh-token", 1800L, user);
    }

    @Test
    void webLoginPutsTheRefreshTokenInAnHttpOnlyCookieAndNotInTheBody() throws Exception {
        when(authService.login(any(), any(), any())).thenReturn(sampleResult());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("ana@pucp.edu.pe", "secreta123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void mobileLoginReturnsTheRefreshTokenInTheBodyAndSetsNoCookie() throws Exception {
        when(authService.login(any(), any(), any())).thenReturn(sampleResult());

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("ana@pucp.edu.pe", "secreta123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
                .andExpect(cookie().doesNotExist("refresh_token"));
    }

    @Test
    void invalidCredentialsReturn401WithTheStandardEnvelope() throws Exception {
        when(authService.login(any(), any(), any()))
                .thenThrow(new UnauthorizedException("Invalid credentials"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("ana@pucp.edu.pe", "mala"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    @Test
    void aMalformedEmailIsRejectedBeforeReachingTheService() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("no-es-un-correo", "secreta123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.errors[0].field").value("email"));
    }

    @Test
    @WithMockUser(username = "ana@pucp.edu.pe", authorities = "COORDINADOR")
    void logoutClearsTheCookieAndReturns204() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie("refresh_token", "refresh-token")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    void logoutRequiresAuthentication() throws Exception {
        // SPEC-001 §3 lo documenta con Authorization: Bearer. Sin sesión no hay
        // nada que cerrar, y aceptarlo sin token permitiría que cualquiera
        // revocara el refresh token de otro con solo adivinarlo.
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    void refreshWithoutAnyTokenReturns401() throws Exception {
        when(authService.refresh(any(), any(), any()))
                .thenThrow(new UnauthorizedException("Invalid or expired token"));

        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }
}
