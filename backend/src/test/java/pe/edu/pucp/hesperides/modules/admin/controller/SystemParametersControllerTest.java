package pe.edu.pucp.hesperides.modules.admin.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParametersService;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.security.CorsConfig;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({SecurityConfig.class, CorsConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class})
@WebMvcTest(SystemParametersController.class)
class SystemParametersControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private SystemParametersService systemParametersService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    // Lo exige SecurityConfig/PasswordChangeRequiredFilter en el slice.
    @MockitoBean private UsersRepository usersRepository;

    private SystemParameterResponse passwordLength() {
        return new SystemParameterResponse(
                "PASSWORD_MIN_LENGTH", "Longitud mínima de contraseña", "10",
                "INTEGER", "Cantidad mínima de caracteres de la contraseña", true);
    }

    // ---------- lectura ----------

    @Test
    void listingWithoutATokenIs401() throws Exception {
        mockMvc.perform(get("/api/v1/system-parameters"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperarioCannotRead() throws Exception {
        when(systemParametersService.findAll())
                .thenReturn(List.of(passwordLength()));

        mockMvc.perform(get("/api/v1/system-parameters"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void anAdminCanRead() throws Exception {
        when(systemParametersService.findAll())
                .thenReturn(List.of(passwordLength()));

        mockMvc.perform(get("/api/v1/system-parameters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Parámetros obtenidos"))
                .andExpect(jsonPath("$.data[0].code").value("PASSWORD_MIN_LENGTH"))
                .andExpect(jsonPath("$.data[0].value").value("10"));
    }

    // ---------- escritura ----------

    @Test
    void updatingWithoutATokenIs401() throws Exception {
        mockMvc.perform(put("/api/v1/system-parameters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"values\":{\"PASSWORD_MIN_LENGTH\":\"12\"}}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperarioCannotUpdateParameters() throws Exception {
        mockMvc.perform(put("/api/v1/system-parameters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"values\":{\"PASSWORD_MIN_LENGTH\":\"12\"}}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void anAdminCanUpdateParameters() throws Exception {
        when(systemParametersService.update(any()))
                .thenReturn(List.of(passwordLength()));

        mockMvc.perform(put("/api/v1/system-parameters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"values\":{\"PASSWORD_MIN_LENGTH\":\"12\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Parámetros actualizados"));

        verify(systemParametersService).update(any());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void anEmptyBodyIsRejectedByBeanValidation() throws Exception {
        mockMvc.perform(put("/api/v1/system-parameters")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}