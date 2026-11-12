package pe.edu.pucp.hesperides.modules.places;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
import pe.edu.pucp.hesperides.modules.places.service.PlaceWorkbookImportService;
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
                 "outline": {"buildingIds": [%d]}, "aliases": ["Instituto de Radioastronomía"]}""".formatted(inrasBuildingId());
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

    private static byte[] placeWorkbook(String name, boolean withPerspective, boolean withPhoto) throws IOException {
        return placeWorkbook(name, withPerspective, withPhoto, true, false);
    }

    private static byte[] placeWorkbook(String name, boolean withPerspective, boolean withPhoto, boolean withPoint)
            throws IOException {
        return placeWorkbook(name, withPerspective, withPhoto, withPoint, false);
    }

    private static byte[] placeWorkbook(String name, boolean withPerspective, boolean withPhoto, boolean withPoint,
            boolean withBuilding) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Lugares");
            var header = sheet.createRow(0);
            for (int i = 0; i < PlaceWorkbookImportService.HEADERS.size(); i++) {
                header.createCell(i).setCellValue(PlaceWorkbookImportService.HEADERS.get(i));
            }
            var row = sheet.createRow(1);
            row.createCell(0).setCellValue(name);
            row.createCell(1).setCellValue("OUTDOOR");
            row.createCell(2).setCellValue("EDIFICIO");
            row.createCell(4).setCellValue("Alias " + name);
            if (withPoint) {
                row.createCell(8).setCellValue(LAT);
                row.createCell(9).setCellValue(LON);
            }
            if (withBuilding) row.createCell(5).setCellValue("1");
            if (withPerspective) {
                row.createCell(11).setCellValue("BACK");
                row.createCell(12).setCellValue(LAT - OFFSET);
                row.createCell(13).setCellValue(LON);
                row.createCell(14).setCellValue(0);
                if (withPhoto) {
                    int picture = workbook.addPicture(png(), Workbook.PICTURE_TYPE_PNG);
                    XSSFClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                    anchor.setRow1(1);
                    anchor.setRow2(2);
                    anchor.setCol1(15);
                    anchor.setCol2(16);
                    sheet.createDrawingPatriarch().createPicture(anchor, picture);
                }
            }
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private static byte[] placeWorkbookRows(String... names) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Lugares");
            var header = sheet.createRow(0);
            for (int i = 0; i < PlaceWorkbookImportService.HEADERS.size(); i++) {
                header.createCell(i).setCellValue(PlaceWorkbookImportService.HEADERS.get(i));
            }
            for (int i = 0; i < names.length; i++) {
                var row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(names[i]);
                row.createCell(1).setCellValue("OUTDOOR");
                row.createCell(2).setCellValue("EDIFICIO");
                row.createCell(4).setCellValue(names[i]);
                row.createCell(8).setCellValue(LAT - 5 * OFFSET);
                row.createCell(9).setCellValue(LON - 5 * OFFSET);
            }
            workbook.write(output);
            return output.toByteArray();
        }
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
                .andExpect(jsonPath("$.data.places[0].buildingIds", contains((int) inrasBuildingId())))
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
    void aPerspectiveKeepsTheMapViewItWasSavedWith() throws Exception {
        String code = createInras();
        String view = """
                "mapView": {"camera": {"lat": %s, "lon": %s, "heightM": 40}, "target": {"lat": %s, "lon": %s, "heightM": 0}}"""
                .formatted(LAT - 2 * OFFSET, LON, LAT, LON);
        String json = postJson(PLACES + "/" + code + "/perspectives",
                "{\"sideCode\": \"BACK\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 0, %s}".formatted(LAT - OFFSET, LON, view))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mapView.camera.heightM").value(40.0))
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(json, "$.data.id");

        // Mover el punto sin mandar vista conserva la que tenía.
        mockMvc.perform(put(PLACES + "/" + code + "/perspectives/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sideCode\": \"BACK\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 10}".formatted(LAT - OFFSET, LON)))
                .andExpect(status().isOk());

        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.perspectives[0].mapView.camera.heightM").value(40.0))
                .andExpect(jsonPath("$.data.perspectives[0].headingDeg").value(10.0));
        mockMvc.perform(get(PLACES + "/map"))
                .andExpect(jsonPath("$.data.perspectives[0].mapView.camera.heightM").value(40.0))
                .andExpect(jsonPath("$.data.perspectives[0].mapView.target.lat").value(LAT));
    }

    @Test
    void savesAndClearsTheMapViewOfTheSelectedPerspective() throws Exception {
        String code = createInras();
        long id = perspectiveId(perspective(code, "BACK", LAT - OFFSET, LON));
        String placeView = """
                {"camera": {"lat": %s, "lon": %s, "heightM": 120}, "target": {"lat": %s, "lon": %s, "heightM": 0}}"""
                .formatted(LAT - OFFSET, LON, LAT, LON);
        String perspectiveView = """
                "mapView": {"camera": {"lat": %s, "lon": %s, "heightM": 40}, "target": {"lat": %s, "lon": %s, "heightM": 0}}"""
                .formatted(LAT - 2 * OFFSET, LON, LAT, LON);
        mockMvc.perform(put(PLACES + "/" + code + "/map-view").contentType(MediaType.APPLICATION_JSON).content(placeView))
                .andExpect(status().isOk());
        mockMvc.perform(put(PLACES + "/" + code + "/perspectives/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sideCode\": \"BACK\", \"lat\": %s, \"lon\": %s, \"headingDeg\": 0, %s}"
                                .formatted(LAT - OFFSET, LON, perspectiveView)))
                .andExpect(status().isOk());

        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.mapView.camera.heightM").value(120.0))
                .andExpect(jsonPath("$.data.perspectives[0].mapView.camera.heightM").value(40.0));

        mockMvc.perform(delete(PLACES + "/" + code + "/perspectives/" + id + "/map-view")).andExpect(status().isOk());
        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.mapView.camera.heightM").value(120.0))
                .andExpect(jsonPath("$.data.perspectives[0].mapView").doesNotExist());
    }

    @Test
    void downloadsThePlacesImportTemplate() throws Exception {
        byte[] content = mockMvc.perform(get(PLACES + "/import/template"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().string("Content-Disposition", containsString("plantilla-importar-lugares.xlsx")))
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new java.io.ByteArrayInputStream(content))) {
            assertThat(workbook.getSheet("Lugares")).isNotNull();
            assertThat(workbook.getSheet("Lugares").getRow(0).getCell(0).getStringCellValue()).isEqualTo("Nombre");
        }
    }

    @Test
    void exportsFilteredPlacesInTheImportTemplateFormatWithOnlySelectedPerspectivePhotos() throws Exception {
        byte[] source = placeWorkbook("Lugar para exportar", true, true);
        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", source);
        mockMvc.perform(multipart(PLACES + "/import").file(file)).andExpect(status().isOk());

        String filters = """
                {
                  "categoryCode": "EDIFICIO",
                  "alias": "alias lugar para exportar",
                  "parentCode": null,
                  "createdFrom": null,
                  "createdTo": null,
                  "point1Lat": -12.07,
                  "point1Lon": -77.09,
                  "point2Lat": -12.07,
                  "point2Lon": -77.07,
                  "point3Lat": -12.06,
                  "point3Lon": -77.08,
                  "includePerspectives": true,
                  "perspectiveSides": ["BACK"]
                }
                """;
        byte[] exported = mockMvc.perform(post(PLACES + "/export")
                        .contentType(MediaType.APPLICATION_JSON).content(filters))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new java.io.ByteArrayInputStream(exported))) {
            XSSFSheet sheet = workbook.getSheet("Lugares");
            assertThat(sheet.getLastRowNum()).isEqualTo(1);
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue())
                    .isEqualTo(PlaceWorkbookImportService.HEADERS.get(0));
            assertThat(sheet.getRow(0).getPhysicalNumberOfCells()).isEqualTo(PlaceWorkbookImportService.HEADERS.size());
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).isEqualTo("Lugar para exportar");
            assertThat(sheet.getRow(1).getCell(8).getNumericCellValue()).isEqualTo(LAT);
            assertThat(sheet.getRow(1).getCell(9).getNumericCellValue()).isEqualTo(LON);
            assertThat(sheet.getRow(1).getCell(5).getStringCellValue()).isEmpty();
            assertThat(sheet.getRow(1).getCell(11).getStringCellValue()).isEqualTo("BACK");
            assertThat(sheet.getRow(1).getCell(16).getStringCellValue()).isEmpty();
            assertThat(sheet.getDrawingPatriarch().getShapes()).hasSize(1);
            XSSFClientAnchor anchor = (XSSFClientAnchor) sheet.getDrawingPatriarch().getShapes().get(0).getAnchor();
            assertThat(anchor.getRow1()).isEqualTo(1);
            assertThat(anchor.getCol1()).isEqualTo((short) 15);
        }
    }

    @Test
    void refusesAnIncompleteThreePointExportArea() throws Exception {
        mockMvc.perform(post(PLACES + "/export").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"point1Lat\":-12.0,\"includePerspectives\":false}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void previewsAndImportsAPlaceWithItsPerspectivePhoto() throws Exception {
        byte[] workbook = placeWorkbook("Lugar por Excel", true, true);
        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", workbook);

        mockMvc.perform(multipart(PLACES + "/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rows").value(1))
                .andExpect(jsonPath("$.data.canImport").value(true))
                .andExpect(jsonPath("$.data.errors", hasSize(0)));

        String response = mockMvc.perform(multipart(PLACES + "/import").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imported").value(1))
                .andExpect(jsonPath("$.data.places[0].name").value("Lugar por Excel"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(response, "$.data.places[0].code");
        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(jsonPath("$.data.perspectives", hasSize(1)))
                .andExpect(jsonPath("$.data.perspectives[0].side.code").value("BACK"))
                .andExpect(jsonPath("$.data.perspectives[0].photos", hasSize(1)))
                .andExpect(jsonPath("$.data.outline.centerLat").value(LAT))
                .andExpect(jsonPath("$.data.outline.centerLon").value(LON));
        String mapJson = mockMvc.perform(get(PLACES + "/map")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> mapPlaces = JsonPath.read(mapJson, "$.data.places");
        Map<String, Object> mapPlace = mapPlaces.stream().filter(place -> code.equals(place.get("code")))
                .findFirst().orElseThrow();
        assertThat(((Number) mapPlace.get("lat")).doubleValue()).isCloseTo(LAT,
                org.assertj.core.data.Offset.offset(1e-9));
        assertThat(((Number) mapPlace.get("lon")).doubleValue()).isCloseTo(LON,
                org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void previewsLocationConflictsAndExplicitlyReplacesTheSelectedPlace() throws Exception {
        drawnPlace("Lugar existente A", LAT, LON, null);
        String selectedCode = drawnPlace("Lugar existente B", LAT, LON, null);
        perspective(selectedCode, "BACK", LAT - OFFSET, LON).andExpect(status().isCreated());
        String childJson = postJson(PLACES, """
                {"name": "Interior conservado", "kindCode": "INDOOR", "categoryCode": "EDIFICIO",
                 "parentCode": "%s", "outline": {}}""".formatted(selectedCode))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String childCode = JsonPath.read(childJson, "$.data.code");
        String mainPhotoJson = mockMvc.perform(multipart(PLACES + "/" + selectedCode + "/photos")
                        .file(new MockMultipartFile("file", "principal.png", "image/png", png()))
                        .param("author", "Equipo de catastro"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number mainPhotoId = JsonPath.read(mainPhotoJson, "$.data.id");

        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                placeWorkbook("Lugar actualizado", true, false));

        mockMvc.perform(multipart(PLACES + "/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canImport").value(true))
                .andExpect(jsonPath("$.data.locationConflicts[0].row").value(2))
                .andExpect(jsonPath("$.data.locationConflicts[0].places", hasSize(3)));

        MockMultipartFile replacements = new MockMultipartFile("replacements", "replacements.json",
                MediaType.APPLICATION_JSON_VALUE,
                "[{\"row\":2,\"placeCode\":\"%s\"}]".formatted(selectedCode).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String response = mockMvc.perform(multipart(PLACES + "/import").file(file).file(replacements))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imported").value(1))
                .andExpect(jsonPath("$.data.places[0].code").value(selectedCode))
                .andExpect(jsonPath("$.data.places[0].replaced").value(true))
                .andReturn().getResponse().getContentAsString();
        String returnedCode = JsonPath.read(response, "$.data.places[0].code");

        mockMvc.perform(get(PLACES + "/" + returnedCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Lugar actualizado"))
                .andExpect(jsonPath("$.data.perspectives", hasSize(1)))
                .andExpect(jsonPath("$.data.perspectives[0].side.code").value("BACK"))
                .andExpect(jsonPath("$.data.perspectives[0].photos", hasSize(0)))
                .andExpect(jsonPath("$.data.children[0].code").value(childCode))
                .andExpect(jsonPath("$.data.mainPhotos[0].id").value(mainPhotoId));
        assertThat(returnedCode).isEqualTo(selectedCode);
    }

    @Test
    void refusesToImportWhenAConflictingLocationHasNoReplacementSelection() throws Exception {
        String code = drawnPlace("Lugar que debe conservarse", LAT, LON, null);
        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                placeWorkbook("Otro lugar", false, false));

        mockMvc.perform(multipart(PLACES + "/import").file(file)).andExpect(status().isBadRequest());
        mockMvc.perform(get(PLACES + "/" + code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Lugar que debe conservarse"));
    }

    @Test
    void refusesToImportAnOutdoorPlaceWithoutMapPointCoordinates() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                placeWorkbook("Lugar sin punto", false, false, false));

        mockMvc.perform(multipart(PLACES + "/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canImport").value(false))
                .andExpect(jsonPath("$.data.errors[0].column").value("Latitud de punto"))
                .andExpect(jsonPath("$.data.errors[1].column").value("Longitud de punto"));
        mockMvc.perform(multipart(PLACES + "/import").file(file)).andExpect(status().isBadRequest());
    }

    @Test
    void refusesToCombineAnOutdoorMapPointWithAnotherOutlineSource() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                placeWorkbook("Lugar con fuentes mezcladas", false, false, true, true));

        mockMvc.perform(multipart(PLACES + "/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canImport").value(false))
                .andExpect(jsonPath("$.data.errors[0].column").value("Ubicación"));
    }

    @Test
    void exportsTheMapCenterOfAnOutdoorPlaceAsAnImportablePoint() throws Exception {
        String code = createInras();
        double[] expectedCenter = center(code);
        byte[] exported = mockMvc.perform(post(PLACES + "/export")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {
                                  "categoryCode": null,
                                  "alias": null,
                                  "parentCode": null,
                                  "createdFrom": null,
                                  "createdTo": null,
                                  "point1Lat": null,
                                  "point1Lon": null,
                                  "point2Lat": null,
                                  "point2Lon": null,
                                  "point3Lat": null,
                                  "point3Lon": null,
                                  "includePerspectives": false,
                                  "perspectiveSides": []
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new java.io.ByteArrayInputStream(exported))) {
            XSSFSheet sheet = workbook.getSheet("Lugares");
            var row = java.util.stream.IntStream.rangeClosed(1, sheet.getLastRowNum())
                    .mapToObj(sheet::getRow)
                    .filter(candidate -> "INRAS".equals(candidate.getCell(0).getStringCellValue()))
                    .findFirst().orElseThrow();
            assertThat(row.getCell(5).getStringCellValue()).isEmpty();
            assertThat(row.getCell(6).getStringCellValue()).isEmpty();
            assertThat(row.getCell(7).getStringCellValue()).isEmpty();
            assertThat(row.getCell(8).getNumericCellValue()).isCloseTo(expectedCenter[0],
                    org.assertj.core.data.Offset.offset(1e-9));
            assertThat(row.getCell(9).getNumericCellValue()).isCloseTo(expectedCenter[1],
                    org.assertj.core.data.Offset.offset(1e-9));
            assertThat(row.getCell(10).getStringCellValue()).isEqualTo("NO");
        }
    }

    @Test
    void refusesToImportNamesAlreadyPresentInTheCatalog() throws Exception {
        String code = createInras();
        String name = jdbc.queryForObject("SELECT name FROM places WHERE code = ?", String.class, code);
        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", placeWorkbook(name, false, false));

        mockMvc.perform(multipart(PLACES + "/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canImport").value(false))
                .andExpect(jsonPath("$.data.errors[0].column").value("Nombre / Alias"));

        mockMvc.perform(multipart(PLACES + "/import").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    void allowsImportedNamesContainingAnExistingNameOrAlias() throws Exception {
        drawnPlace("Prueba", LAT, LON, null);
        postJson(PLACES, """
                {"name": "Lugar con alias", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO",
                 "outline": {"geometry": {"type": "Point", "coordinates": [%s, %s]}}, "aliases": ["Prueba"]}"""
                .formatted(LON, LAT)).andExpect(status().isCreated());

        MockMultipartFile file = new MockMultipartFile("file", "lugares.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                placeWorkbookRows("Prueba 2", "Prueba 3", "Lugar de Prueba"));

        mockMvc.perform(multipart(PLACES + "/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canImport").value(true))
                .andExpect(jsonPath("$.data.errors", hasSize(0)));
        mockMvc.perform(multipart(PLACES + "/import").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imported").value(3));
    }

    @Test
    void aPerspectiveWithoutMapViewUsesTheDefault() throws Exception {
        String code = createInras();
        perspective(code, "BACK", LAT - OFFSET, LON).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mapView").doesNotExist());
    }

    private long perspectiveId(ResultActions created) throws Exception {
        return ((Number) JsonPath.read(created.andReturn().getResponse().getContentAsString(), "$.data.id")).longValue();
    }

    @Test
    void newPerspectivesGoLastAndTheOrderCanBeChanged() throws Exception {
        String code = createInras();
        long side = perspectiveId(perspective(code, "SIDE", LAT, LON - OFFSET));
        long back = perspectiveId(perspective(code, "BACK", LAT - OFFSET, LON));
        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.perspectives[*].id", contains((int) side, (int) back)));

        mockMvc.perform(put(PLACES + "/" + code + "/perspectives/order").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\": [%d, %d]}".formatted(back, side))).andExpect(status().isOk());

        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.perspectives[*].id", contains((int) back, (int) side)));
    }

    @Test
    void theNewOrderMustListExactlyThePlacesPerspectives() throws Exception {
        String code = createInras();
        long side = perspectiveId(perspective(code, "SIDE", LAT, LON - OFFSET));
        perspective(code, "BACK", LAT - OFFSET, LON);

        mockMvc.perform(put(PLACES + "/" + code + "/perspectives/order").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\": [%d]}".formatted(side))).andExpect(status().isUnprocessableEntity());
        mockMvc.perform(put(PLACES + "/" + code + "/perspectives/order").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\": [%d, %d, 999999]}".formatted(side, side))).andExpect(status().isUnprocessableEntity());
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

    /** The campus building closest to INRAS: a second block for a place drawn in several pieces. */
    private long neighbourBuildingId() {
        return jdbc.queryForObject("""
                SELECT b.id FROM campus_buildings b, campus_buildings i
                 WHERE i.source_ref = 'way/615391653' AND b.id <> i.id AND b.deleted_at IS NULL AND b.is_campus
                 ORDER BY ST_Distance(b.footprint, i.footprint) LIMIT 1""", Long.class);
    }

    private ResultActions placeOnBuildings(String name, long... buildingIds) throws Exception {
        String ids = java.util.Arrays.stream(buildingIds).mapToObj(Long::toString)
                .collect(java.util.stream.Collectors.joining(", "));
        return postJson(PLACES, """
                {"name": "%s", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO", "outline": {"buildingIds": [%s]}}"""
                .formatted(name, ids));
    }

    private String codeOf(ResultActions created) throws Exception {
        return JsonPath.read(created.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),
                "$.data.code");
    }

    private double[] center(String code) throws Exception {
        String json = mockMvc.perform(get(PLACES + "/" + code)).andReturn().getResponse().getContentAsString();
        Double lat = JsonPath.read(json, "$.data.outline.centerLat");
        Double lon = JsonPath.read(json, "$.data.outline.centerLon");
        return lat == null ? null : new double[] {lat, lon};
    }

    @Test
    void aPlaceCanSpanSeveralBuildings() throws Exception {
        long a = inrasBuildingId();
        long b = neighbourBuildingId();
        String code = codeOf(placeOnBuildings("Pabellón partido", a, b, a));

        mockMvc.perform(get(PLACES + "/" + code)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.outline.source").value("BUILDING"))
                .andExpect(jsonPath("$.data.outline.buildingIds", org.hamcrest.Matchers.containsInAnyOrder((int) a, (int) b)));
        mockMvc.perform(get(PLACES + "/map")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.places[0].buildingIds", org.hamcrest.Matchers.containsInAnyOrder((int) a, (int) b)));
        Double unionCenterLat = jdbc.queryForObject("""
                SELECT ST_Y(ST_Centroid(ST_Union(footprint))) FROM campus_buildings WHERE id IN (?, ?)""", Double.class, a, b);
        assertThat(center(code)[0]).isCloseTo(unionCenterLat, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void theFirstBuildingStaysInTheOldColumnForBranchesThatStillReadIt() throws Exception {
        long a = inrasBuildingId();
        String code = codeOf(placeOnBuildings("Bloques", a, neighbourBuildingId()));

        assertThat(jdbc.queryForObject("SELECT building_id FROM places WHERE code = ?", Long.class, code)).isEqualTo(a);
    }

    @Test
    void aComplexLeavesTheOldColumnEmpty() throws Exception {
        String code = codeOf(complex("Complejo"));

        assertThat(jdbc.queryForObject("SELECT building_id FROM places WHERE code = ?", Long.class, code)).isNull();
    }

    @Test
    void aPlaceSavedByAnOlderBranchIsReadWithItsBuildingAndKeepsIt() throws Exception {
        long a = inrasBuildingId();
        String code = jdbc.queryForObject("""
                INSERT INTO places (name, kind_item_id, category_item_id, building_id)
                SELECT 'De otra rama', k.id, c.id, ? FROM catalog_items k, catalog_items c
                 WHERE k.code = 'OUTDOOR' AND c.code = 'EDIFICIO' RETURNING code""", String.class, a);

        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.outline.buildingIds", contains((int) a)));
        mockMvc.perform(get(PLACES + "/map")).andExpect(jsonPath("$.data.places[0].buildingIds", contains((int) a)));
        placeOnBuildings("Intruso", a).andExpect(status().isConflict());
    }

    @Test
    void aBuildingBelongsToOnlyOnePlace() throws Exception {
        placeOnBuildings("Primero", inrasBuildingId()).andExpect(status().isCreated());

        placeOnBuildings("Segundo", neighbourBuildingId(), inrasBuildingId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Primero")));
    }

    @Test
    void editingAPlaceKeepsItsOwnBuildingsAndFreesTheOnesItDrops() throws Exception {
        long a = inrasBuildingId();
        long b = neighbourBuildingId();
        String code = codeOf(placeOnBuildings("Bloques", a, b));

        mockMvc.perform(put(PLACES + "/" + code).contentType(MediaType.APPLICATION_JSON).content("""
                {"name": "Bloques", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO", "outline": {"buildingIds": [%d]}}"""
                .formatted(a))).andExpect(status().isOk());

        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.outline.buildingIds", contains((int) a)));
        placeOnBuildings("Bloque suelto", b).andExpect(status().isCreated());
    }

    @Test
    void deletingAPlaceFreesItsBuildings() throws Exception {
        String code = codeOf(placeOnBuildings("Temporal", inrasBuildingId()));

        mockMvc.perform(delete(PLACES + "/" + code)).andExpect(status().isOk());

        placeOnBuildings("Definitivo", inrasBuildingId()).andExpect(status().isCreated());
    }

    @Test
    void anEmptyBuildingListIsNoOutline() throws Exception {
        placeOnBuildings("Sin bloques").andExpect(status().isUnprocessableEntity());
    }

    private ResultActions complex(String name) throws Exception {
        return postJson(PLACES, """
                {"name": "%s", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO", "outline": {"fromChildren": true}}"""
                .formatted(name));
    }

    @Test
    void aComplexTakesItsOutlineFromItsChildren() throws Exception {
        String code = codeOf(complex("Complejo"));
        assertThat(center(code)).isNull();
        mockMvc.perform(get(PLACES + "/" + code)).andExpect(jsonPath("$.data.outline.source").value("CHILDREN"));

        drawnPlace("Ala norte", LAT + OFFSET, LON, code);
        drawnPlace("Ala sur", LAT - OFFSET, LON, code);

        double[] middle = center(code);
        assertThat(middle[0]).isCloseTo(LAT, org.assertj.core.data.Offset.offset(1e-7));
        assertThat(middle[1]).isCloseTo(LON, org.assertj.core.data.Offset.offset(1e-7));
        perspective(code, "BACK", LAT - 2 * OFFSET, LON).andExpect(status().isCreated());
    }

    @Test
    void aComplexInsideAComplexAddsUpTheWholeTree() throws Exception {
        String outer = codeOf(complex("Campus norte"));
        String inner = codeOf(postJson(PLACES, """
                {"name": "Facultad", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO", "parentCode": "%s",
                 "outline": {"fromChildren": true}}""".formatted(outer)));
        drawnPlace("Aula", LAT + OFFSET, LON, inner);
        drawnPlace("Laboratorio", LAT - OFFSET, LON, inner);

        assertThat(center(outer)[0]).isCloseTo(LAT, org.assertj.core.data.Offset.offset(1e-7));
    }

    @Test
    void onlyAnOutdoorPlaceTakesItsOutlineFromItsChildren() throws Exception {
        String parent = drawnPlace("Edificio", LAT, LON, null);

        postJson(PLACES, """
                {"name": "Piso 1", "kindCode": "INDOOR", "categoryCode": "PISO", "parentCode": "%s",
                 "outline": {"fromChildren": true}}""".formatted(parent)).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void childrenAndBuildingsAreTwoOutlinesNotOne() throws Exception {
        postJson(PLACES, """
                {"name": "Mezcla", "kindCode": "OUTDOOR", "categoryCode": "EDIFICIO",
                 "outline": {"fromChildren": true, "buildingIds": [%d]}}""".formatted(inrasBuildingId()))
                .andExpect(status().is4xxClientError());
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
