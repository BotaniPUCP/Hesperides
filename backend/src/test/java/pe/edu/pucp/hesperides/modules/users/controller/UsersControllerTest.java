package pe.edu.pucp.hesperides.modules.users.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.users.service.UsersService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.security.CorsConfig;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({SecurityConfig.class, CorsConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class})
@WebMvcTest(UsersController.class)
class UsersControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private UsersService usersService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    private UserDetailResponse sampleUser(CredentialStatus status) {
        return new UserDetailResponse(48L, "mgarcia@pucp.edu.pe", "María", "García", "María García",
                new RoleResponse(2L, "COORDINADOR", "Coordinador"), true,
                status, true, null, List.of(), null, null);
    }

    private static final String CREATE_BODY = """
            {"email":"mgarcia@pucp.edu.pe","firstName":"María","lastName":"García",
             "roleCode":"COORDINADOR","initialPassword":"ClaveValida123"}
            """;

    // ---------- autorizacion ----------

    @Test
    void listingWithoutATokenIs401() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperarioCannotListUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Insufficient permissions for this action"));
    }

    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorCanListUsers() throws Exception {
        when(usersService.findAll(any(), any(), any(), any(), any(), anyString()))
                .thenReturn(new PageImpl<>(List.of(sampleUser(CredentialStatus.DELIVERED))));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].email").value("mgarcia@pucp.edu.pe"));
    }

    @Test
    @WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
    void aCoordinadorCannotCreateUsers() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_BODY))
                .andExpect(status().isForbidden());
    }

    // ---------- create ----------

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createReturns201WithLocationAndTheCreatedUser() throws Exception {
        when(usersService.create(any())).thenReturn(
                new UsersService.CreationResult(sampleUser(CredentialStatus.DELIVERED), true));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_BODY))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/users/48"))
                .andExpect(jsonPath("$.message").value("User created successfully"))
                .andExpect(jsonPath("$.data.id").value(48));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createStillReturns201WhenTheEmailFailedButSaysSo() throws Exception {
        // El frontend distingue los dos casos por credentialStatus, no por el
        // mensaje, pero el mensaje tampoco debe mentir (SPEC-100 §3).
        when(usersService.create(any())).thenReturn(new UsersService.CreationResult(
                sampleUser(CredentialStatus.PENDING_DELIVERY), false));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("User created, but credential delivery failed"))
                .andExpect(jsonPath("$.data.credentialStatus").value("PENDING_DELIVERY"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createWithAMalformedEmailIs400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"no-es-correo","firstName":"M","lastName":"G",
                                 "roleCode":"COORDINADOR","initialPassword":"ClaveValida123"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.errors[0].field").value("email"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createWithAnInactiveRoleIs422() throws Exception {
        when(usersService.create(any()))
                .thenThrow(new BusinessRuleException("Role 'INVENTADO' does not exist or is not active"));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_BODY))
                .andExpect(status().isUnprocessableEntity());
    }

    // ---------- update y acciones ----------

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void updateReturns200WithTheUpdatedUser() throws Exception {
        when(usersService.update(anyLong(), any())).thenReturn(sampleUser(CredentialStatus.DELIVERED));

        mockMvc.perform(put("/api/v1/users/48")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"mgarcia@pucp.edu.pe","firstName":"María",
                                 "lastName":"García","roleCode":"COORDINADOR"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(48));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void deactivateReturns200WithTheResourceNot204() throws Exception {
        // SPEC-C03 §8: una accion de negocio devuelve 200 con el recurso en su
        // nuevo estado, no 204, para que el cliente no tenga que volver a pedirlo.
        when(usersService.deactivate(anyLong(), anyString()))
                .thenReturn(sampleUser(CredentialStatus.DELIVERED));

        mockMvc.perform(post("/api/v1/users/48/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(48));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void deactivatingYourselfIs422() throws Exception {
        when(usersService.deactivate(anyLong(), anyString()))
                .thenThrow(new BusinessRuleException("You cannot deactivate your own account"));

        mockMvc.perform(post("/api/v1/users/1/deactivate"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("You cannot deactivate your own account"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void reactivateReturns200() throws Exception {
        when(usersService.reactivate(anyLong())).thenReturn(sampleUser(CredentialStatus.DELIVERED));

        mockMvc.perform(post("/api/v1/users/48/reactivate"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void resendCredentialsReturnsTheDeliveryStatusAndNeverThePassword() throws Exception {
        when(usersService.resendCredentials(anyLong()))
                .thenReturn(new CredentialDeliveryResponse(48L, "mgarcia@pucp.edu.pe",
                        CredentialStatus.DELIVERED));

        mockMvc.perform(post("/api/v1/users/48/resend-credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.temporaryPassword").doesNotExist());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void markCredentialsDeliveredReturns200() throws Exception {
        when(usersService.markCredentialsDelivered(anyLong()))
                .thenReturn(sampleUser(CredentialStatus.DELIVERED));

        mockMvc.perform(post("/api/v1/users/48/mark-credentials-delivered"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void aMissingUserIs404() throws Exception {
        when(usersService.findById(anyLong(), anyString()))
                .thenThrow(new ResourceNotFoundException("User not found"));

        mockMvc.perform(get("/api/v1/users/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    // ---------- cambio de contrasena propia ----------

    @Test
    @WithMockUser(username = "ana@pucp.edu.pe", authorities = "OPERARIO")
    void anyAuthenticatedUserCanChangeTheirOwnPassword() throws Exception {
        mockMvc.perform(post("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"Actual123456","newPassword":"Nueva1234567"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully"));
    }

    @Test
    void changingYourPasswordWithoutATokenIs401() throws Exception {
        mockMvc.perform(post("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"Actual123456","newPassword":"Nueva1234567"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperarioCanRequestTheirOwnDetail() throws Exception {
        // getById solo exige autenticacion: el alcance lo aplica el servicio, que
        // devuelve 404 para la ficha de cualquier otro.
        when(usersService.findById(anyLong(), anyString()))
                .thenReturn(sampleUser(CredentialStatus.DELIVERED));

        mockMvc.perform(get("/api/v1/users/48"))
                .andExpect(status().isOk());
    }
}
