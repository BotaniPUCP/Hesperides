package pe.edu.pucp.hesperides.modules.places;

import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

/** El catálogo de lugares de punta a punta: lugares, perspectivas con nombre automático y fotos. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class PlacesIntegrationTest {

    private static final String PLACES = "/api/v1/places";
    /** Centro del INRAS (way/615391653), aislado: ningún edificio con nombre a menos de 80 m. */
    private static final double LAT = -12.0654932;
    private static final double LON = -77.0815324;
    /** ~22 m en grados en el campus. */
    private static final double OFFSET = 0.0002;

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
    private JdbcTemplate jdbc;

    private long inrasBuildingId() {
        return jdbc.queryForObject("SELECT id FROM campus_buildings WHERE source_ref = 'way/615391653'", Long.class);
    }

    private ResultActions postJson(String url, String body) throws Exception {
        return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String createInras() throws Exception {
        String body = """
                {"name": "INRAS", "kindCode": "OUTDOOR", "categoryCode": "CENTROS_INSTITUTOS",
                 "outline": {"buildingId": %d}, "aliases": ["Instituto de Radioastronomía"]}""".formatted(inrasBuildingId());
        String json = postJson(PLACES, body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.data.code");
    }

    private String drawnPlace(String name, double lat, double lon, String parentCode) throws Exception {
        String parent = parentCode == null ? "null" : "\"" + parentCode + "\"";
        String body = """
                {"name": "%s", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO", "parentCode": %s,
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}}""".formatted(name, parent, lon, lat);
        String json = postJson(PLACES, body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.data.code");
    }

    private ResultActions perspective(String code, String side, double lat, double lon) throws Exception {
        return postJson(PLACES + "/" + code + "/perspectives",
                "{\"sideCode\": \"%s\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 0}".formatted(side, lat, lon));
    }

    private static byte[] png() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(600, 400, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }

    @Test
    void createsAPlaceOnAnExistingBuildingAndFindsItByAlias() throws Exception {
        String code = createInras();

        mockMvc.perform(get(PLACES + "/" + code)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("INRAS"))
                .andExpect(jsonPath("$.data.kind.code").value("OUTDOOR"))
                .andExpect(jsonPath("$.data.outline.source").value("BUILDING"))
                .andExpect(jsonPath("$.data.aliases", contains("Instituto de Radioastronomía")));
        mockMvc.perform(get(PLACES).param("q", "radioastronom")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", contains(code)));
    }

    @Test
    void theBackAndTheSidesAreNamedByTheSystem() throws Exception {
        String code = createInras();

        perspective(code, "BACK", LAT - OFFSET, LON).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.displayName").value("Espalda de INRAS"));
        perspective(code, "SIDE", LAT, LON - OFFSET).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.displayName").value("Al lado de INRAS · oeste"))
                .andExpect(jsonPath("$.data.compass").value("WEST"));
    }

    @Test
    void previewsTheNameWithoutSavingThePerspective() throws Exception {
        String code = createInras();
        drawnPlace("Caseta de riego", LAT, LON - 2 * OFFSET, null);

        postJson(PLACES + "/" + code + "/perspectives/preview",
                "{\"sideCode\": \"SIDE\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 90}".formatted(LAT, LON - OFFSET))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("Al lado de INRAS · oeste, hacia Caseta de riego"));
        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.perspectives", hasSize(0)));
    }

    @Test
    void theMapGetsEveryPlaceWithItsCenterAndEveryPerspective() throws Exception {
        String code = createInras();
        perspective(code, "BACK", LAT - OFFSET, LON).andExpect(status().isCreated());

        mockMvc.perform(get(PLACES + "/map")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.places[0].code").value(code))
                .andExpect(jsonPath("$.data.places[0].buildingId").value(inrasBuildingId()))
                .andExpect(jsonPath("$.data.places[0].lat").isNumber())
                .andExpect(jsonPath("$.data.perspectives[0].displayName").value("Espalda de INRAS"))
                .andExpect(jsonPath("$.data.perspectives[0].place.code").value(code))
                .andExpect(jsonPath("$.data.perspectives[0].headingDeg").value(0.0));
    }

    @Test
    void savesAndClearsTheMapViewOfAPlace() throws Exception {
        String code = createInras();
        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.mapView").doesNotExist());

        mockMvc.perform(put(PLACES + "/" + code + "/map-view").contentType(MediaType.APPLICATION_JSON).content("""
                {"camera": {"lat": %s, "lon": %s, "heightM": 120.5}, "target": {"lat": %s, "lon": %s, "heightM": 0}}"""
                .formatted(LAT - OFFSET, LON, LAT, LON))).andExpect(status().isOk());

        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.mapView.camera.heightM").value(120.5))
                .andExpect(jsonPath("$.data.mapView.target.lat").value(LAT));

        mockMvc.perform(delete(PLACES + "/" + code + "/map-view")).andExpect(status().isOk());
        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.mapView").doesNotExist());
    }

    @Test
    void aMapViewWithoutTargetIsRejected() throws Exception {
        String code = createInras();

        mockMvc.perform(put(PLACES + "/" + code + "/map-view").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"camera\": {\"lat\": %s, \"lon\": %s, \"heightM\": 100}}".formatted(LAT, LON)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aPlaceHasOnlyOneBack() throws Exception {
        String code = createInras();
        perspective(code, "BACK", LAT - OFFSET, LON).andExpect(status().isCreated());

        perspective(code, "BACK", LAT - 2 * OFFSET, LON).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void aSideGainsItsLandmarkWhenANearbyPlaceIsRegisteredLater() throws Exception {
        String code = createInras();
        perspective(code, "SIDE", LAT, LON - OFFSET).andExpect(status().isCreated());

        drawnPlace("Caseta de riego", LAT, LON - 2 * OFFSET, null);

        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.perspectives[0].displayName").value("Al lado de INRAS · oeste, hacia Caseta de riego"));
    }

    @Test
    void anOutdoorPlaceNeedsAnOutline() throws Exception {
        postJson(PLACES, """
                {"name": "Sin contorno", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO", "outline": {}}""")
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void anIndoorPlaceHasNoPerspectives() throws Exception {
        String building = createInras();
        String json = postJson(PLACES, """
                {"name": "Piso 2", "kindCode": "INDOOR", "categoryCode": "PISO", "parentCode": "%s", "outline": {}}"""
                .formatted(building)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String floor = JsonPath.read(json, "$.data.code");

        perspective(floor, "FRONT", LAT, LON).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void aFourthLevelIsRejected() throws Exception {
        String zone = drawnPlace("Zona deportiva", LAT, LON, null);
        String complex = drawnPlace("Polideportivo", LAT, LON, zone);
        String court = drawnPlace("Cancha 1", LAT, LON, complex);

        postJson(PLACES, """
                {"name": "Tribuna", "kindCode": "OUTDOOR", "categoryCode": "DEPORTE", "parentCode": "%s",
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}}""".formatted(court, LON, LAT))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void aPlaceCannotHangFromItsOwnChild() throws Exception {
        String complex = drawnPlace("Polideportivo", LAT, LON, null);
        String court = drawnPlace("Cancha 1", LAT, LON, complex);

        mockMvc.perform(put(PLACES + "/" + complex).contentType(MediaType.APPLICATION_JSON).content("""
                {"name": "Polideportivo", "kindCode": "OUTDOOR", "categoryCode": "DEPORTE", "parentCode": "%s",
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}}""".formatted(court, LON, LAT)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void aPlaceWithChildrenCannotBeDeleted() throws Exception {
        String complex = drawnPlace("Polideportivo", LAT, LON, null);
        drawnPlace("Cancha 1", LAT, LON, complex);

        mockMvc.perform(delete(PLACES + "/" + complex)).andExpect(status().isConflict());
    }

    @Test
    void theSameNameTwiceUnderTheSameParentIsADuplicate() throws Exception {
        drawnPlace("Pabellón Z", LAT, LON, null);

        postJson(PLACES, """
                {"name": "pabellón z", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO",
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}}""".formatted(LON, LAT))
                .andExpect(status().isConflict());
    }

    @Test
    void suggestsThePerspectivesAroundSomeoneOnCampus() throws Exception {
        String code = createInras();
        perspective(code, "BACK", LAT - OFFSET, LON).andExpect(status().isCreated());

        mockMvc.perform(get(PLACES + "/perspectives/near").param("lat", String.valueOf(LAT - OFFSET - 0.00005))
                        .param("lon", String.valueOf(LON)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].displayName", contains("Espalda de INRAS")));
        mockMvc.perform(get(PLACES + "/perspectives/near").param("lat", String.valueOf(LAT + 0.002))
                        .param("lon", String.valueOf(LON)))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void aPerspectivePhotoIsListedAndServedWithoutSession() throws Exception {
        String code = createInras();
        String json = perspective(code, "BACK", LAT - OFFSET, LON).andReturn().getResponse().getContentAsString();
        Number perspectiveId = JsonPath.read(json, "$.data.id");

        String upload = mockMvc.perform(multipart(PLACES + "/" + code + "/photos")
                        .file(new MockMultipartFile("file", "espalda.png", "image/png", png()))
                        .param("perspectiveId", perspectiveId.toString()).param("author", "Equipo de catastro"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number photoId = JsonPath.read(upload, "$.data.id");

        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.perspectives[0].photos[0].author").value("Equipo de catastro"));
        mockMvc.perform(get("/api/v1/files/places/" + photoId).param("size", "thumb")
                        .with(anonymous()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperatorCanReadButNotEdit() throws Exception {
        mockMvc.perform(get(PLACES)).andExpect(status().isOk());
        postJson(PLACES, """
                {"name": "X", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO",
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}}""".formatted(LON, LAT))
                .andExpect(status().isForbidden());
    }
}
