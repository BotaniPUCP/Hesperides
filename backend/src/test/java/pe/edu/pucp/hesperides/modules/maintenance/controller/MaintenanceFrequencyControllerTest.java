package pe.edu.pucp.hesperides.modules.maintenance.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.SeasonalIntervalPayload;
import pe.edu.pucp.hesperides.modules.maintenance.service.MaintenanceFrequenciesService;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.security.CorsConfig;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({SecurityConfig.class, CorsConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class})
@WebMvcTest(MaintenanceFrequencyController.class)
class MaintenanceFrequencyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MaintenanceFrequenciesService frequenciesService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private UsersRepository usersRepository;

    /**
     * Un response de ejemplo. Centralizado porque el record lleva muchos campos y
     * repetirlos en cada test convierte cualquier cambio de forma en una tarea de
     * buscar y reemplazar.
     */
    private static MaintenanceFrequencyResponse dummyResponse() {
        return new MaintenanceFrequencyResponse(
                1L,
                new MaintenanceFrequencyResponse.ActivityTypeSummary(10L, "CORTE_CESPED", "Corte de cesped", null),
                "OUTSOURCED",
                new MaintenanceFrequencyResponse.FrequencyRuleTypeSummary(101L, "INTERVAL_DAYS", "Intervalo por rango de dias"),
                "CAMPUS_WIDE",
                null,
                21, 30, 45,
                null, null, 3,
                null, null,
                List.of(new SeasonalIntervalPayload("VERANO", 1, 3, 30, 35, 21)),
                "Notas",
                LocalDate.now(), null,
                true, true,
                Instant.now(), Instant.now());
    }

    @Test
    void getAll_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/maintenance/frequencies"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void getAll_asOperario_returnsOk() throws Exception {
        MaintenanceFrequencyResponse dummy = dummyResponse();

        when(frequenciesService.findAll(any(), any(), any())).thenReturn(List.of(dummy));

        mockMvc.perform(get("/api/v1/maintenance/frequencies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].activityType.code").value("CORTE_CESPED"));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void create_asOperario_returns403() throws Exception {
        String json = """
                {
                    "activityTypeItemId": 10,
                    "regime": "OUTSOURCED",
                    "frequencyRuleTypeCode": "INTERVAL_DAYS",
                    "scope": "CAMPUS_WIDE",
                    "minDaysInterval": 30,
                    "maxDaysInterval": 45
                }
                """;

        mockMvc.perform(post("/api/v1/maintenance/frequencies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "COORDINADOR")
    void create_asCoordinador_returnsCreated() throws Exception {
        String json = """
                {
                    "activityTypeItemId": 10,
                    "regime": "OUTSOURCED",
                    "frequencyRuleTypeCode": "INTERVAL_DAYS",
                    "scope": "CAMPUS_WIDE",
                    "minDaysInterval": 30,
                    "maxDaysInterval": 45
                }
                """;

        MaintenanceFrequencyResponse dummy = dummyResponse();

        when(frequenciesService.create(any(CreateMaintenanceFrequencyRequest.class))).thenReturn(dummy);

        mockMvc.perform(post("/api/v1/maintenance/frequencies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void delete_asAdmin_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/maintenance/frequencies/1"))
                .andExpect(status().isNoContent());
    }
}
