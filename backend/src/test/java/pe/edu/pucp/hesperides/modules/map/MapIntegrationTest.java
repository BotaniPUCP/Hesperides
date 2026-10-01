package pe.edu.pucp.hesperides.modules.map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El mapa contra PostGIS real con la carga completa de V011 (SPEC-102). Las
 * geometrías, el GeoJSON que arma la base y la caché por versión solo se pueden
 * probar aquí.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MapIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theLayersCarryEveryLoadedElement() throws Exception {
        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layers.sectors.features", hasSize(5)))
                .andExpect(jsonPath("$.data.layers.sections.features", hasSize(531)))
                .andExpect(jsonPath("$.data.layers.subsections.features", hasSize(2)))
                .andExpect(jsonPath("$.data.layers.supervisionZones.features", hasSize(4)))
                .andExpect(jsonPath("$.data.layers.references.features", hasSize(411)))
                .andExpect(jsonPath("$.data.layers.buildings.features", hasSize(417)))
                .andExpect(jsonPath("$.data.layers.features.features", hasSize(227)))
                .andExpect(jsonPath("$.data.layers.vegetation.features", hasSize(965)))
                .andExpect(jsonPath("$.data.attributionRequired").value(true))
                .andExpect(jsonPath("$.data.origin.lat").exists());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void sectionsCarryTheirLandscapeTypeAndIrrigation() throws Exception {
        // El visor colorea por riego y separa los jardines xerofíticos con estos campos.
        String av = "$.data.layers.sections.features[?(@.properties.code == 'AV-0001')].properties";
        String xe = "$.data.layers.sections.features[?(@.properties.code == 'XE-0001')].properties";
        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(av + ".landscapeType").value("GREEN_AREA"))
                .andExpect(jsonPath(av + ".irrigationCurrent").value("Riego por aspersión"))
                .andExpect(jsonPath(av + ".irrigationProject").value("Cuenta con aspersión"))
                .andExpect(jsonPath(xe + ".landscapeType").value("XEROPHYTIC"));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void plantsCarryTheirSpeciesAndOnlyMeasuredHeights() throws Exception {
        // El visor dibuja la altura medida si existe; si no, una ilustrativa que
        // nunca viaja desde la base (C-08).
        String measured = "$.data.layers.vegetation.features[?(@.properties.code == 'EV-000001')].properties";
        String unknown = "$.data.layers.vegetation.features[?(@.properties.code == 'EV-000458')].properties";
        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(measured + ".speciesSlug").value("roystonea-regia"))
                .andExpect(jsonPath(measured + ".commonName").value("Palmera real"))
                .andExpect(jsonPath(measured + ".typeCode").value("PALM"))
                .andExpect(jsonPath(measured + ".heightM").value(7.5))
                .andExpect(jsonPath(measured + ".crownRadiusM").value(3.4))
                .andExpect(jsonPath(unknown + ".heightM").value(org.hamcrest.Matchers.contains((Object) null)));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void aCachedCopyWithTheCurrentVersionGetsA304() throws Exception {
        String etag = mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader(HttpHeaders.ETAG);

        mockMvc.perform(get("/api/v1/map/layers").header(HttpHeaders.IF_NONE_MATCH, etag))
                .andExpect(status().isNotModified());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void editingAZoneInvalidatesTheCachedCopy() throws Exception {
        String etag = mockMvc.perform(get("/api/v1/map/layers"))
                .andReturn().getResponse().getHeader(HttpHeaders.ETAG);

        jdbcTemplate.update("UPDATE zones SET name = 'Jardín renombrado' WHERE code = 'AV-0001'");

        mockMvc.perform(get("/api/v1/map/layers").header(HttpHeaders.IF_NONE_MATCH, etag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layers.sections.features[?(@.properties.code == 'AV-0001')]"
                        + ".properties.name").value("Jardín renombrado"));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void aPointInsideASectionIsDescribedByThatSection() throws Exception {
        Map<String, Object> p = pointOnSurface("SELECT boundary FROM zones WHERE code = 'AV-0001'");

        mockMvc.perform(post("/api/v1/map/describe").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lat\":" + p.get("lat") + ",\"lon\":" + p.get("lon") + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sectionCode").value("AV-0001"))
                .andExpect(jsonPath("$.data.text").exists());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void aPointInsideABuildingIsDescribedAsInsideIt() throws Exception {
        Map<String, Object> p = pointOnSurface(
                "SELECT footprint FROM campus_buildings WHERE source_ref = 'relation/7127770'");

        mockMvc.perform(post("/api/v1/map/describe").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lat\":" + p.get("lat") + ",\"lon\":" + p.get("lon") + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.relation").value("INSIDE"))
                .andExpect(jsonPath("$.data.buildingName").value("Comedor Central"));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void aLatitudeOutOfRangeIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/map/describe").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lat\":100,\"lon\":-77.08}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void withoutASessionTheMapIsClosed() throws Exception {
        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theVersionIsExposedOnItsOwn() throws Exception {
        mockMvc.perform(get("/api/v1/map/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").isNumber());
    }

    private Map<String, Object> pointOnSurface(String geometrySql) {
        return jdbcTemplate.queryForMap("SELECT ST_Y(p) AS lat, ST_X(p) AS lon FROM ("
                + "SELECT ST_PointOnSurface(g) AS p FROM (" + geometrySql + ") AS t(g)) AS s");
    }
}
