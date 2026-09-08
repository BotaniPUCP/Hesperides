package pe.edu.pucp.hesperides.modules.users.controller;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.service.UsersService;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Prueba el mapeo del controller aislado (sin cadena de seguridad). Los
 * endpoints que necesitan el actor autenticado (list/get/deactivate/me/password)
 * se ejercitan en UsersIntegrationTest, con la cadena real, porque la
 * resolución de @AuthenticationPrincipal exige un request autenticado.
 */
@WebMvcTest(UsersController.class)
@AutoConfigureMockMvc(addFilters = false)
class UsersControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private UsersService usersService;
    @MockitoBean private UsersRepository usersRepository;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    private static final UserResponse RESPONSE = new UserResponse(
            48L, "mgarcia@pucp.edu.pe", "María", "García", "María García",
            new RoleResponse(2L, "COORDINADOR", "Coordinador"), true,
            CredentialStatus.DELIVERED, true, null, List.of(), null, null);

    @Test
    void createReturns201WithLocationAndTheFinalDeliveryStatus() throws Exception {
        when(usersService.create(any())).thenAnswer(inv -> {
            CreateUserRequest request = inv.getArgument(0);
            return new UserResponse(48L, request.email(), request.firstName(), request.lastName(),
                    request.firstName() + " " + request.lastName(),
                    new RoleResponse(2L, "COORDINADOR", "Coordinador"), true,
                    CredentialStatus.PENDING_DELIVERY, true, null, List.of(), null, null);
        });
        when(usersService.deliverCredentials(48L, "Clave1234"))
                .thenReturn(new UsersService.DeliveryOutcome(true, RESPONSE));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateUserRequest(
                                "mgarcia@pucp.edu.pe", "María", "García", "COORDINADOR", "Clave1234"))))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/users/48"))
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.message").value("User created successfully"))
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test
    void createReportsTheFailureWhenTheMailCouldNotBeSent() throws Exception {
        when(usersService.create(any())).thenReturn(RESPONSE);
        when(usersService.deliverCredentials(48L, "Clave1234"))
                .thenReturn(new UsersService.DeliveryOutcome(false, RESPONSE));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateUserRequest(
                                "mgarcia@pucp.edu.pe", "María", "García", "COORDINADOR", "Clave1234"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message")
                        .value("User created, but credential delivery failed"));
    }

    @Test
    void createRejectsAMalformedEmailBeforeReachingTheService() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateUserRequest(
                                "no-es-correo", "María", "García", "COORDINADOR", "Clave1234"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.errors[0].field").value("email"));
    }

    @Test
    void updateDelegatesAndReturnsTheRefreshedUser() throws Exception {
        when(usersService.update(eq(48L), any())).thenReturn(RESPONSE);

        mockMvc.perform(put("/api/v1/users/48")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateUserRequest(
                                "mgarcia@pucp.edu.pe", "María", "García", "COORDINADOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("mgarcia@pucp.edu.pe"));
    }

    @Test
    void resendCredentialsReportsTheDeliveryOutcome() throws Exception {
        when(usersService.resendCredentials(48L))
                .thenReturn(new UsersService.ResendResult(48L, "Temporal2026"));
        when(usersService.deliverCredentials(48L, "Temporal2026"))
                .thenReturn(new UsersService.DeliveryOutcome(true, RESPONSE));

        mockMvc.perform(post("/api/v1/users/48/resend-credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Credentials sent successfully"))
                .andExpect(jsonPath("$.data.id").value(48))
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"));
    }

    @Test
    void reactivateReturnsTheRefreshedUser() throws Exception {
        when(usersService.reactivate(48L)).thenReturn(RESPONSE);

        mockMvc.perform(post("/api/v1/users/48/reactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true));
    }
}