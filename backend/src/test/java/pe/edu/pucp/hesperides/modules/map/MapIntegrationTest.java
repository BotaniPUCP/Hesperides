package pe.edu.pucp.hesperides.modules.map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
                // Los 417 de antes y los 42 principales nuevos del plano (SPEC-108 §4).
                .andExpect(jsonPath("$.data.layers.buildings.features", hasSize(459)))
                .andExpect(jsonPath("$.data.layers.features.features", hasSize(294)))
                .andExpect(jsonPath("$.data.layers.vegetation.features", hasSize(965)))
                .andExpect(jsonPath("$.data.attributionRequired").value(true))
                .andExpect(jsonPath("$.data.origin.lat").exists());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void buildingsCarryPlanFields() throws Exception {
        // Un principal trae su clave del plano y sus códigos oficiales; un agrupado,
        // solo el id de su principal (SPEC-108 §3). El Comedor Central de OSM quedó
        // agrupado bajo el principal nuevo del plano, que lleva el código 40.
        Map<String, Object> grouped = jdbcTemplate.queryForMap(
                "SELECT id, parent_building_id FROM campus_buildings WHERE source_ref = 'relation/7127770'");
        String principal = "$.data.layers.buildings.features[?(@.properties.planKey == "
                + "'df5f87ed-a1f7-4fa6-ae35-b7f423f61806')].properties";
        String child = "$.data.layers.buildings.features[?(@.properties.id == "
                + ((Number) grouped.get("id")).intValue() + ")].properties";

        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(principal + ".codes[0].code").value("40"))
                .andExpect(jsonPath(principal + ".codes[0].label").value("COMEDOR CENTRAL"))
                .andExpect(jsonPath(principal + ".parentId").value(contains((Object) null)))
                .andExpect(jsonPath(principal + ".baseM").value(0.2))
                .andExpect(jsonPath(child + ".parentId")
                        .value(((Number) grouped.get("parent_building_id")).intValue()))
                .andExpect(jsonPath(child + ".planKey").value(contains((Object) null)))
                .andExpect(jsonPath(child + ".codes").value(contains((Object) null)));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theEtagCarriesFormat3() throws Exception {
        // Una copia guardada antes de SPEC-108 no trae parentId: no debe recibir 304.
        mockMvc.perform(get("/api/v1/map/layers"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ETAG, endsWith("-f3\"")));
    }

    @Test
    void modelRequiresSession() throws Exception {
        // CA-12: el modelo no se descarga sin iniciar sesión (D-06).
        mockMvc.perform(get("/api/v1/map/models/buildings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void modelIsServedWithEtag() throws Exception {
        MockHttpServletResponse response = mockMvc.perform(get("/api/v1/map/models/buildings"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("model/gltf-binary"))
                // Débil, para que Tomcat lo comprima (R15).
                .andExpect(header().string(HttpHeaders.ETAG, startsWith("W/\"")))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-cache"))
                .andReturn().getResponse();
        assertThat(new String(response.getContentAsByteArray(), 0, 4, StandardCharsets.US_ASCII)).isEqualTo("glTF");

        mockMvc.perform(get("/api/v1/map/models/buildings")
                        .header(HttpHeaders.IF_NONE_MATCH, response.getHeader(HttpHeaders.ETAG)))
                .andExpect(status().isNotModified());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void manifestComesInTheEnvelope() throws Exception {
        mockMvc.perform(get("/api/v1/map/models/buildings/manifest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.manifest.anchor.lat").exists());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void proximityUsesOnlyPrincipals() throws Exception {
        // Un punto que está a la vez en un edificio agrupado y en su principal, y en
        // ningún otro principal. Sin el filtro, el agrupado (de V011, con id menor)
        // ganaría el empate y la descripción lo nombraría a él. Se elige uno con
        // nombre propio distinto del de su principal para que el nombre los distinga.
        Map<String, Object> p = jdbcTemplate.queryForMap("SELECT ST_Y(s.pt) AS lat, ST_X(s.pt) AS lon, "
                + "s.principal_name FROM (SELECT ST_PointOnSurface(ST_CollectionExtract("
                + "ST_Intersection(c.footprint, pr.footprint), 3)) AS pt, c.id AS child_id, "
                + "pr.id AS principal_id, pr.name AS principal_name "
                + "FROM campus_buildings c JOIN campus_buildings pr ON pr.id = c.parent_building_id "
                + "WHERE c.deleted_at IS NULL AND c.is_active AND c.is_campus "
                + "AND c.name IS NOT NULL AND c.name <> pr.name "
                + "AND ST_Area(ST_Intersection(c.footprint, pr.footprint)) > 0) AS s "
                + "WHERE NOT EXISTS (SELECT 1 FROM campus_buildings o WHERE o.id <> s.principal_id "
                + "AND o.parent_building_id IS NULL AND o.deleted_at IS NULL AND o.is_active AND o.is_campus "
                + "AND ST_Intersects(o.footprint, s.pt)) "
                + "ORDER BY s.child_id LIMIT 1");

        mockMvc.perform(post("/api/v1/map/describe").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lat\":" + p.get("lat") + ",\"lon\":" + p.get("lon") + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.relation").value("INSIDE"))
                .andExpect(jsonPath("$.data.buildingName").value(p.get("principal_name")));
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
    void aCopySavedWithAnOlderResponseFormatIsReplaced() throws Exception {
        // Una copia de antes de que existiera la capa de vegetación tenía la
        // misma versión de datos: si recibiera 304, el visor se quedaría con
        // capas que ya no corresponden a su código y fallaría al dibujar.
        Long version = jdbcTemplate.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class);

        mockMvc.perform(get("/api/v1/map/layers").header(HttpHeaders.IF_NONE_MATCH, "\"" + version + "\""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layers.vegetation").exists());
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
