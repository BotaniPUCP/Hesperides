package pe.edu.pucp.hesperides.modules.map.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.map.service.BuildingModelService;
import pe.edu.pucp.hesperides.modules.map.service.LocationDescriptionService;
import pe.edu.pucp.hesperides.modules.map.service.MapLayersService;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.security.CorsConfig;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El modelo de edificios con la cadena de seguridad real y el modelo real del
 * jar (SPEC-108 §3, CA-12). Las capas y la cercanía, que necesitan PostGIS, se
 * prueban en MapIntegrationTest.
 */
@Import({SecurityConfig.class, CorsConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, BuildingModelService.class})
@WebMvcTest(MapController.class)
class MapControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private BuildingModelService modelService;

    @MockitoBean private MapLayersService layersService;
    @MockitoBean private LocationDescriptionService descriptionService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    // Lo exige SecurityConfig/PasswordChangeRequiredFilter en el slice.
    @MockitoBean private UsersRepository usersRepository;

    private String weakEtag() {
        return "W/" + modelService.etag();
    }

    @Test
    void withoutASessionTheModelIs401() throws Exception {
        mockMvc.perform(get("/api/v1/map/models/buildings"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.ok").value(false));
    }

    @Test
    void withoutASessionTheManifestIs401() throws Exception {
        mockMvc.perform(get("/api/v1/map/models/buildings/manifest"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theModelIsServedAsBinaryGltfWithAWeakEtag() throws Exception {
        // Débil: Tomcat no comprime una respuesta con ETag fuerte (R15).
        MockHttpServletResponse response = mockMvc.perform(get("/api/v1/map/models/buildings"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("model/gltf-binary"))
                .andExpect(header().string(HttpHeaders.ETAG, weakEtag()))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-cache"))
                .andReturn().getResponse();

        assertThat(new String(response.getContentAsByteArray(), 0, 4, StandardCharsets.US_ASCII)).isEqualTo("glTF");
        assertThat(response.getContentAsByteArray()).hasSameSizeAs(modelService.model());
    }

    @Test
    @WithMockUser(authorities = "SUPERVISOR")
    void theWeakEtagTheServerSentGetsA304WithoutBody() throws Exception {
        MockHttpServletResponse response = mockMvc.perform(get("/api/v1/map/models/buildings")
                        .header(HttpHeaders.IF_NONE_MATCH, weakEtag()))
                .andExpect(status().isNotModified())
                .andExpect(header().string(HttpHeaders.ETAG, weakEtag()))
                .andReturn().getResponse();

        assertThat(response.getContentAsByteArray()).isEmpty();
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theStrongFormOfTheSameEtagAlsoGetsA304() throws Exception {
        // La comparación de If-None-Match es débil (RFC 9110 §13.1.2): con o sin W/
        // es la misma etiqueta, venga sola o en una lista.
        mockMvc.perform(get("/api/v1/map/models/buildings").header(HttpHeaders.IF_NONE_MATCH, modelService.etag()))
                .andExpect(status().isNotModified());
        mockMvc.perform(get("/api/v1/map/models/buildings")
                        .header(HttpHeaders.IF_NONE_MATCH, "\"otro\", " + modelService.etag()))
                .andExpect(status().isNotModified());
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void aCopyWithAnotherEtagGetsTheModel() throws Exception {
        mockMvc.perform(get("/api/v1/map/models/buildings").header(HttpHeaders.IF_NONE_MATCH, "\"otro\""))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "COORDINADOR")
    void theManifestTravelsRawInsideTheEnvelope() throws Exception {
        String version = modelService.etag().replace("\"", "");

        mockMvc.perform(get("/api/v1/map/models/buildings/manifest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.manifest.version").value(version))
                .andExpect(jsonPath("$.data.manifest.anchor.lat").isNumber())
                .andExpect(jsonPath("$.data.manifest.nodes").isMap())
                .andExpect(jsonPath("$.data.manifest.sunken").isArray());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theManifestCarriesTheModelEtagAndIsRevalidated() throws Exception {
        // Sin ETag ni Cache-Control propios, Spring Security pondría no-store y el
        // navegador volvería a bajar los ~225 kB en cada visita.
        String etag = mockMvc.perform(get("/api/v1/map/models/buildings/manifest"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ETAG, modelService.etag()))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-cache"))
                .andReturn().getResponse().getHeader(HttpHeaders.ETAG);

        MockHttpServletResponse notModified = mockMvc.perform(get("/api/v1/map/models/buildings/manifest")
                        .header(HttpHeaders.IF_NONE_MATCH, etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string(HttpHeaders.ETAG, modelService.etag()))
                .andReturn().getResponse();
        assertThat(notModified.getContentAsByteArray()).isEmpty();
    }

    @Test
    @WithMockUser(authorities = "SUPERVISOR")
    void theManifestComparesEtagsWeakly() throws Exception {
        mockMvc.perform(get("/api/v1/map/models/buildings/manifest").header(HttpHeaders.IF_NONE_MATCH, weakEtag()))
                .andExpect(status().isNotModified());
        mockMvc.perform(get("/api/v1/map/models/buildings/manifest").header(HttpHeaders.IF_NONE_MATCH, "\"otro\""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.manifest.version").exists());
    }
}
