package pe.edu.pucp.hesperides.modules.irrigation.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationTurnResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;
import pe.edu.pucp.hesperides.modules.irrigation.service.IrrigationTurnsService;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.security.CorsConfig;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({SecurityConfig.class, CorsConfig.class, RestAuthenticationEntryPoint.class,
    RestAccessDeniedHandler.class, GlobalExceptionHandler.class})
@WebMvcTest(IrrigationTurnsController.class)
class IrrigationTurnsControllerTest {
    private static final String API = "/api/v1/irrigation";
    private static final String EMAIL = "registrador@example.test";
    private static final LocalDate DATE = LocalDate.of(2026, 11, 5);
    private static final String TURN = """
        {"sectorZoneId": 1, "irrigationDate": "2026-11-05", "sectionZoneIds": [11]}
        """;
    private static final String BATCH = """
        {"turns": [%s, {"sectorZoneId": 2, "irrigationDate": "2026-11-05", "sectionZoneIds": [21]}]}
        """.formatted(TURN);
    private static final IrrigationZoneResponse SECTION = new IrrigationZoneResponse(11L, "A-1", "Sección A-1");
    private static final IrrigationTurnResponse RESPONSE = new IrrigationTurnResponse(
        101L, 1L, "Sector A", 41L, DATE, null, null, List.of(SECTION), null, null, null);

    @Autowired MockMvc mvc;
    @MockitoBean IrrigationTurnsService service;
    @MockitoBean JwtTokenProvider jwtTokenProvider;
    @MockitoBean CustomUserDetailsService customUserDetailsService;
    @MockitoBean UsersRepository usersRepository;

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "COORDINADOR", "ADMIN"})
    void permitsSingleAndBatchCreation(String role) throws Exception {
        var principal = user(EMAIL).authorities(new SimpleGrantedAuthority(role));
        when(service.create(any(), eq(EMAIL))).thenReturn(RESPONSE);
        when(service.createBatch(anyList(), eq(EMAIL))).thenReturn(List.of(RESPONSE));

        mvc.perform(post(API + "/turns").with(principal).contentType(MediaType.APPLICATION_JSON).content(TURN))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", API + "/turns/101"))
            .andExpect(jsonPath("$.data.supervisorUserId").value(41));
        mvc.perform(post(API + "/turns/batch").with(principal).contentType(MediaType.APPLICATION_JSON).content(BATCH))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].id").value(101));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "COORDINADOR", "ADMIN"})
    void permitsCatalogAndFilteredHistory(String role) throws Exception {
        var principal = user(EMAIL).authorities(new SimpleGrantedAuthority(role));
        when(service.sectors(EMAIL)).thenReturn(List.of(new IrrigationZoneResponse(1L, "A", "Sector A")));
        when(service.sections(1L, EMAIL)).thenReturn(List.of(SECTION));
        when(service.list(DATE, DATE.plusDays(1), 1L, EMAIL)).thenReturn(List.of(RESPONSE));

        mvc.perform(get(API + "/sectors").with(principal))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].id").value(1));
        mvc.perform(get(API + "/sectors/1/sections").with(principal))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].id").value(11));
        mvc.perform(get(API + "/turns").param("from", DATE.toString()).param("to", DATE.plusDays(1).toString())
                .param("sectorId", "1").with(principal))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].id").value(101));
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERARIO", "OTRO"})
    void rejectsDirectCreationWith403(String role) throws Exception {
        var principal = user(EMAIL).authorities(new SimpleGrantedAuthority(role));
        mvc.perform(post(API + "/turns").with(principal).contentType(MediaType.APPLICATION_JSON).content(TURN))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.ok").value(false));
        mvc.perform(post(API + "/turns/batch").with(principal).contentType(MediaType.APPLICATION_JSON).content(BATCH))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.ok").value(false));
        verifyNoInteractions(service);
    }

    @Test
    void preservesValidationAndNotFoundErrorFormat() throws Exception {
        var principal = user(EMAIL).authorities(new SimpleGrantedAuthority("ADMIN"));
        when(service.create(any(), eq(EMAIL))).thenThrow(new ValidationException("Sección inválida"));
        when(service.sections(3L, EMAIL)).thenThrow(new ResourceNotFoundException("Sector no disponible"));

        mvc.perform(post(API + "/turns").with(principal).contentType(MediaType.APPLICATION_JSON).content(TURN))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.ok").value(false))
            .andExpect(jsonPath("$.message").value("Sección inválida"));
        mvc.perform(get(API + "/sectors/3/sections").with(principal))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.ok").value(false))
            .andExpect(jsonPath("$.message").value("Sector no disponible"));
    }
}
