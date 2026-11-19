package pe.edu.pucp.hesperides.modules.interventions;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Planning;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser(username="spatial-admin@test.local",authorities="ADMIN")
class InterventionZoneSelectionsIntegrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",postgres::getJdbcUrl);
        r.add("spring.datasource.username",postgres::getUsername);
        r.add("spring.datasource.password",postgres::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    long place,otherPlace,zone,second,third,actor;
    long item(String type,String code) {
        return jdbc.queryForObject("SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code=? AND i.code=?",Long.class,type,code);
    }
    long place(String name) {
        return jdbc.queryForObject("""
            INSERT INTO places(name,kind_item_id,category_item_id,own_geometry)
            VALUES (?,?,?,ST_GeomFromText('POLYGON((-77.1 -12.1,-77.099 -12.1,-77.099 -12.099,-77.1 -12.1))',4326)) RETURNING id
            """,Long.class,name,item("PLACE_KIND","OUTDOOR"),item("REFERENCE_CATEGORY","EDIFICIO"));
    }
    long zone(double offset) {
        return jdbc.queryForObject("""
            INSERT INTO zones(code,name,zone_type_item_id,landscape_type_item_id,boundary)
            VALUES (?,?,?, ?,ST_Multi(ST_MakeEnvelope(?, -12.1, ?, -12.099,4326))) RETURNING id
            """,Long.class,"TEST-"+UUID.randomUUID().toString().substring(0,20),"Test green zone",item("ZONE_TYPE","SECTION"),
            item("LANDSCAPE_TYPE","GREEN_AREA"),-77.1+offset,-77.099+offset);
    }
    @BeforeEach void setup() {
        jdbc.update("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE email IN ('spatial-admin@test.local','spatial-worker@test.local') AND deleted_at IS NULL");
        actor=jdbc.queryForObject("INSERT INTO users(email,password_hash,first_name,last_name,role_item_id) VALUES ('spatial-admin@test.local','test','Spatial','Admin',?) RETURNING id",Long.class,item("ROLE","ADMIN"));
        jdbc.update("INSERT INTO users(email,password_hash,first_name,last_name,role_item_id) VALUES ('spatial-worker@test.local','test','Spatial','Worker',?)",item("ROLE","OPERARIO"));
        place=place("Library "+UUID.randomUUID()); otherPlace=place("Other "+UUID.randomUUID());
        zone=zone(0);second=zone(0.0005);third=zone(0.01);
    }
    String path(long id) { return "/api/v1/interventions/places/"+id+"/zones"; }
    JsonNode options(long id) throws Exception {
        return json.readTree(mvc.perform(get(path(id))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
    }
    Map<String,Object> reviewBody(JsonNode o,List<Long> ids) {
        return new LinkedHashMap<>(Map.of("datasetRevision",o.get("datasetRevision").asString(),
            "version",o.get("reviewVersion").asLong(),"zoneIds",ids,"reason","Confirmed whole zones"));
    }
    JsonNode review(long id,List<Long> ids) throws Exception {
        return json.readTree(mvc.perform(put(path(id)).contentType("application/json").content(json.writeValueAsString(reviewBody(options(id),ids))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
    }
    Map<String,Object> location(long place,long zone,String token) {
        return new LinkedHashMap<>(Map.of("clientReference",UUID.randomUUID(),"placeId",place,"zoneId",zone,"zoneSelectionRevision",token));
    }
    Map<String,Object> plan(List<Map<String,Object>> locations) {
        long type=jdbc.queryForObject("SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_TYPE' AND i.is_active ORDER BY i.id LIMIT 1",Long.class);
        long clazz=jdbc.queryForObject("SELECT parent_item_id FROM catalog_items WHERE id=?",Long.class,type);
        return new LinkedHashMap<>(Map.of("classItemId",clazz,"typeItemId",type,"scheduledDate",java.time.LocalDate.now(java.time.ZoneId.of("America/Lima")).toString(),"locations",locations));
    }
    JsonNode create(Map<String,Object> body,String key,int expected) throws Exception {
        var text=mvc.perform(post("/api/v1/interventions").header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return json.readTree(text).get("data");
    }
    JsonNode campus() throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/interventions/campus-selection")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
    }
    Map<String,Object> campusArea(long zone,String token) {
        return new LinkedHashMap<>(Map.of("clientReference",UUID.randomUUID(),"zoneId",zone,"zoneSelectionRevision",token));
    }
    long specimen() {
        return jdbc.queryForObject("SELECT id FROM green_elements WHERE is_active AND deleted_at IS NULL AND location IS NOT NULL ORDER BY id LIMIT 1",Long.class);
    }
    Map<String,Object> specimenLocation(long id) {
        return new LinkedHashMap<>(Map.of("clientReference",UUID.randomUUID(),"elementIds",List.of(id)));
    }
    @Test void campusAcceptsDistantAreasWithoutPlacesOrReviewsAndKeepsSnapshots() throws Exception {
        var token=campus().get("selectionRevision").asString();
        var body=plan(List.of(campusArea(zone,token),campusArea(third,token)));body.put("campusSelectionRevision",token);
        var d=create(body,UUID.randomUUID().toString(),201);
        assertThat(d.get("locations").size()).isEqualTo(2);
        assertThat(d.get("campusSelectionRevision").asString()).isEqualTo(token);
        for(var l:d.get("locations")) {
            assertThat(l.get("placeId").isNull()).isTrue();assertThat(l.get("zoneBoundary").isNull()).isFalse();
            assertThat(l.get("elementIds").size()).isZero();
        }
        var edit=new ArrayList<Map<String,Object>>();
        for(int n=0;n<2;n++) {var row=new LinkedHashMap<>((Map<String,Object>)bodyLocation(body,n));row.put("id",d.get("locations").get(n).get("id").asLong());edit.add(row);}
        body.put("locations",edit);body.put("version",d.get("version").asLong());
        mvc.perform(put("/api/v1/interventions/"+d.get("id").asLong()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
    }
    @SuppressWarnings("unchecked") Map<String,Object> bodyLocation(Map<String,Object> body,int n) {return ((List<Map<String,Object>>)body.get("locations")).get(n);}
    @Test void campusSpecimensAreIndependentHaveDerivedCoordinatesAndNoInventedArea() throws Exception {
        var token=campus().get("selectionRevision").asString();var body=plan(List.of(specimenLocation(specimen())));body.put("campusSelectionRevision",token);
        var d=create(body,UUID.randomUUID().toString(),201);var l=d.get("locations").get(0);
        assertThat(l.get("elementIds").size()).isEqualTo(1);assertThat(l.get("location").isNull()).isFalse();
        assertThat(l.get("zoneId").isNull()).isTrue();assertThat(l.get("requestedQuantity").isNull()).isTrue();
        mvc.perform(post("/api/v1/interventions/campus-selection/preview").contentType("application/json")
            .content(json.writeValueAsString(Map.of("selectionRevision",token,"zoneIds",List.of(),"specimenIds",List.of(specimen())))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.surfaceM2").value(0)).andExpect(jsonPath("$.data.specimenCount").value(1));
    }
    @Test void campusRejectsDuplicatesManualValuesStaleInventoryAndUnauthorizedPreview() throws Exception {
        var token=campus().get("selectionRevision").asString();
        var body=plan(List.of(campusArea(zone,token),campusArea(zone,token)));body.put("campusSelectionRevision",token);
        create(body,UUID.randomUUID().toString(),400);
        body=plan(List.of(specimenLocation(specimen()),specimenLocation(specimen())));body.put("campusSelectionRevision",token);create(body,UUID.randomUUID().toString(),400);
        var area=campusArea(zone,token);area.put("requestedQuantity",1);body=plan(List.of(area));body.put("campusSelectionRevision",token);create(body,UUID.randomUUID().toString(),400);
        jdbc.update("UPDATE zones SET boundary=ST_Translate(boundary,0.001,0) WHERE id=?",zone);
        body=plan(List.of(campusArea(zone,token)));body.put("campusSelectionRevision",token);create(body,UUID.randomUUID().toString(),409);
        mvc.perform(get("/api/v1/interventions/campus-selection").with(user("spatial-worker@test.local").authorities(()->"OPERARIO"))).andExpect(status().isForbidden());
    }
    @Test void campusMixedPreviewUsesUnionAndDoesNotAutomaticallySelectSpecimens() throws Exception {
        var token=campus().get("selectionRevision").asString();
        var expected=jdbc.queryForObject("SELECT round(ST_Area(ST_Union(boundary)::geography)::numeric,2) FROM zones WHERE id IN (?,?)",BigDecimal.class,zone,second);
        var response=json.readTree(mvc.perform(post("/api/v1/interventions/campus-selection/preview").contentType("application/json")
            .content(json.writeValueAsString(Map.of("selectionRevision",token,"zoneIds",List.of(zone,second),"specimenIds",List.of(specimen())))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        assertThat(response.get("surfaceM2").decimalValue()).isEqualByComparingTo(expected);
        var body=plan(List.of(campusArea(zone,token),specimenLocation(specimen())));body.put("campusSelectionRevision",token);
        var d=create(body,UUID.randomUUID().toString(),201);assertThat(d.get("locations").size()).isEqualTo(2);
    }
    @Test void unreviewedPlaceIsClosedAndOnlyPlannersCanReview() throws Exception {
        var o=options(place);
        assertThat(o.get("reviewed").asBoolean()).isFalse();
        assertThat(o.get("zones").size()).isZero();
        var body=reviewBody(o,List.of(zone));
        mvc.perform(put(path(place)).with(user("spatial-worker@test.local").authorities(()->"OPERARIO"))
            .contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isForbidden());
        mvc.perform(get(path(place)).with(user("spatial-worker@test.local").authorities(()->"OPERARIO")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.candidates.length()").value(0));
        create(plan(List.of(location(place,zone,"a".repeat(64)))),UUID.randomUUID().toString(),409);
    }
    @Test void reviewReplacementHasHistoryAndOptimisticVersion() throws Exception {
        var first=review(place,List.of(zone));
        var old=reviewBody(first,List.of(second));
        var next=review(place,List.of(second));
        assertThat(next.get("reviewVersion").asLong()).isEqualTo(2);
        assertThat(next.get("selectionRevision").asString()).isNotEqualTo(first.get("selectionRevision").asString());
        mvc.perform(put(path(place)).contentType("application/json").content(json.writeValueAsString(old))).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_place_zone_reviews WHERE place_id=?",Integer.class,place)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_place_zone_reviews WHERE place_id=? AND deleted_at IS NOT NULL",Integer.class,place)).isEqualTo(1);
        create(plan(List.of(location(place,zone,first.get("selectionRevision").asString()))),UUID.randomUUID().toString(),409);
    }
    @Test void derivedPlanningPreservesIndependentZonesAndDoesNotCountOverlapTwice() throws Exception {
        var o=review(place,List.of(zone,second)); var token=o.get("selectionRevision").asString();
        var body=plan(List.of(location(place,zone,token),location(place,second,token)));
        var key=UUID.randomUUID().toString();var d=create(body,key,201);
        long id=d.get("id").asLong();
        assertThat(d.get("locations").size()).isEqualTo(2);
        for(var l:d.get("locations")) {
            assertThat(l.get("unitItemId").asLong()).isEqualTo(item("MEASUREMENT_UNIT","M2"));
            assertThat(l.get("requestedQuantity").asDouble()).isPositive();
            assertThat(l.get("zoneBoundary").get("type").asString()).isEqualTo("MultiPolygon");
            assertThat(l.get("location").get("latitude").asDouble()).isBetween(-12.1,-12.099);
        }
        BigDecimal expected=jdbc.queryForObject("SELECT round(ST_Area(ST_Union(boundary)::geography)::numeric,2) FROM zones WHERE id IN (?,?)",BigDecimal.class,zone,second);
        assertThat(d.get("plannedSurfaceM2").decimalValue()).isEqualByComparingTo(expected);
        assertThat(d.get("quantityTotals").get(0).get("requestedQuantity").decimalValue()).isEqualByComparingTo(expected);
        assertThat(create(body,key,200).get("id").asLong()).isEqualTo(id);
        jdbc.update("UPDATE zones SET boundary=ST_Multi(ST_MakeEnvelope(-77.1,-12.1,-77.098,-12.099,4326)) WHERE id=?",zone);
        var after=json.readTree(mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        assertThat(after.get("plannedSurfaceM2").decimalValue()).isEqualByComparingTo(expected);
        assertThat(after.get("locations")).isEqualTo(d.get("locations"));
        assertThat(options(place).get("current").asBoolean()).isFalse();
        create(body,UUID.randomUUID().toString(),409);
    }
    @Test void unrelatedInactiveAndDuplicatedZonesCannotBePlanned() throws Exception {
        String token=review(place,List.of(zone)).get("selectionRevision").asString();
        create(plan(List.of(location(place,third,token))),UUID.randomUUID().toString(),422);
        review(otherPlace,List.of(zone));
        String other=options(otherPlace).get("selectionRevision").asString();
        create(plan(List.of(location(place,zone,token),location(otherPlace,zone,other))),UUID.randomUUID().toString(),400);
        jdbc.update("UPDATE zones SET is_active=FALSE WHERE id=?",zone);
        create(plan(List.of(location(place,zone,token))),UUID.randomUUID().toString(),409);
    }
    @Test void bibliotecaCentralPersistsExactlyTheFiveConfirmedAssociations() throws Exception {
        jdbc.update("UPDATE places SET own_geometry=(SELECT footprint FROM campus_buildings WHERE source_ref='way/157964892' LIMIT 1) WHERE id=?",place);
        List<Long> ids=jdbc.query("SELECT id FROM zones WHERE code IN (?,?,?,?,?) ORDER BY id",
            (rs,n)->rs.getLong(1),"AV-0174","AV-0377","AV-0378","AV-0380","AV-0381");
        assertThat(ids).hasSize(5);
        var o=review(place,ids);
        assertThat(o.get("zones").size()).isEqualTo(5);
        var selected=ids.stream().map(id->location(place,id,o.get("selectionRevision").asString())).toList();
        var d=create(plan(selected),UUID.randomUUID().toString(),201);
        assertThat(d.get("locations").size()).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_place_zone_links l JOIN intervention_place_zone_reviews r ON r.id=l.review_id WHERE r.place_id=? AND r.deleted_at IS NULL",Integer.class,place)).isEqualTo(5);
        create(plan(List.of(location(place,third,o.get("selectionRevision").asString()))),UUID.randomUUID().toString(),422);
    }
    @Test void legacyQuantitiesCannotBeSilentlyConvertedToSquareMeters() throws Exception {
        var legacy=new LinkedHashMap<String,Object>(Map.of("clientReference",UUID.randomUUID(),"zoneId",zone,
            "unitItemId",item("MEASUREMENT_UNIT","UNIT"),"requestedQuantity",4.125));
        var body=plan(List.of(legacy));var d=create(body,UUID.randomUUID().toString(),201);
        long locationId=d.get("locations").get(0).get("id").asLong();
        legacy.put("id",locationId);legacy.put("placeId",place);
        legacy.put("zoneSelectionRevision",review(place,List.of(zone)).get("selectionRevision").asString());
        legacy.remove("unitItemId");legacy.remove("requestedQuantity");body.put("version",0);
        mvc.perform(put("/api/v1/interventions/"+d.get("id").asLong()).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT requested_quantity FROM intervention_locations WHERE id=?",BigDecimal.class,locationId)).isEqualByComparingTo("4.125");
        assertThat(jdbc.queryForObject("SELECT zone_selection_revision FROM intervention_locations WHERE id=?",String.class,locationId)).isNull();
    }
    @Test void manualValuesAndLegacyDowngradeAreRejectedForMappedLocations() throws Exception {
        String token=review(place,List.of(zone)).get("selectionRevision").asString();
        var l=location(place,zone,token);l.put("requestedQuantity",1);
        create(plan(List.of(l)),UUID.randomUUID().toString(),400);
        l.remove("requestedQuantity");var body=plan(List.of(l));var d=create(body,UUID.randomUUID().toString(),201);
        l.put("id",d.get("locations").get(0).get("id").asLong());l.remove("zoneSelectionRevision");body.put("version",0);
        mvc.perform(put("/api/v1/interventions/"+d.get("id").asLong()).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isUnprocessableEntity());
    }
    @Test void duplicateUnknownAndInvalidGeometryReviewsAreRejected() throws Exception {
        var o=options(place);
        mvc.perform(put(path(place)).contentType("application/json").content(json.writeValueAsString(reviewBody(o,List.of(zone,zone)))))
            .andExpect(status().isBadRequest());
        mvc.perform(put(path(place)).contentType("application/json").content(json.writeValueAsString(reviewBody(o,List.of(Long.MAX_VALUE)))))
            .andExpect(status().isUnprocessableEntity());
        jdbc.update("UPDATE zones SET boundary=NULL WHERE id=?",zone);
        mvc.perform(put(path(place)).contentType("application/json").content(json.writeValueAsString(reviewBody(options(place),List.of(zone)))))
            .andExpect(status().isUnprocessableEntity());
    }
    @Test void multipartReviewRequiresExplicitAcknowledgment() throws Exception {
        jdbc.update("UPDATE zones SET boundary=ST_Multi(ST_Union(boundary,ST_MakeEnvelope(-77.09,-12.1,-77.089,-12.099,4326))) WHERE id=?",zone);
        var body=reviewBody(options(place),List.of(zone));
        mvc.perform(put(path(place)).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isUnprocessableEntity());
        body.put("multipartAcknowledged",List.of(zone));
        mvc.perform(put(path(place)).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_place_zone_links WHERE zone_id=? AND multipart_acknowledged",Integer.class,zone)).isEqualTo(1);
    }
    @Test void legacyRequestSerializationDoesNotChangeIdempotencyHashes() {
        var body=plan(List.of(new LinkedHashMap<>(Map.of("clientReference",UUID.randomUUID(),"zoneId",zone))));
        var parsed=json.readValue(json.writeValueAsString(body),Planning.class);
        assertThat(json.readTree(json.writeValueAsString(parsed)).get("locations").get(0).has("zoneSelectionRevision")).isFalse();
    }
    @Test void corsAllowsTheNewReviewAndSelectionRequests() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options(path(place)).header("Origin","http://localhost:3000").header("Access-Control-Request-Method","PUT")
            .header("Access-Control-Request-Headers","Authorization,Content-Type"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:3000"));
    }
    @Test void previewUsesTheSameUnionAndDoesNotCreateWork() throws Exception {
        var o=review(place,List.of(zone,second));
        var selections=List.of(Map.of("placeId",place,"zoneId",zone,"zoneSelectionRevision",o.get("selectionRevision").asString()),
            Map.of("placeId",place,"zoneId",second,"zoneSelectionRevision",o.get("selectionRevision").asString()));
        var body=json.writeValueAsString(Map.of("selections",selections));
        int before=jdbc.queryForObject("SELECT count(*) FROM interventions",Integer.class);
        var data=json.readTree(mvc.perform(post("/api/v1/interventions/zone-selection/preview").contentType("application/json").content(body))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
        var expected=jdbc.queryForObject("SELECT round(ST_Area(ST_Union(boundary)::geography)::numeric,2) FROM zones WHERE id IN (?,?)",BigDecimal.class,zone,second);
        assertThat(data.get("surfaceM2").decimalValue()).isEqualByComparingTo(expected);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM interventions",Integer.class)).isEqualTo(before);
        mvc.perform(post("/api/v1/interventions/zone-selection/preview").with(user("spatial-worker@test.local").authorities(()->"OPERARIO"))
            .contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/interventions/zone-selection/preview").contentType("application/json")
            .content(json.writeValueAsString(Map.of("selections",List.of(selections.get(0),selections.get(0)))))).andExpect(status().isBadRequest());
    }
}
