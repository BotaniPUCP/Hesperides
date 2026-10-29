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
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.mock.web.MockMultipartFile;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import pe.edu.pucp.hesperides.shared.storage.StoredFileNotFoundException;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser(username="planner@test.local", authorities="ADMIN")
class InterventionsIntegrationTest {
    @Container static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoSpyBean FileStorage storage;
    long planner, coordinator, supervisor, operator, otherSupervisor, otherOperator, team, otherTeam, classId, typeId;

    @BeforeEach void data() {
        // This container belongs exclusively to this class. Keep history and use
        // real HTTP transaction boundaries, including rollback on invalid children.
        jdbc.update("update interventions set deleted_at=current_timestamp where created_by_user_id in (select id from users where email like '%@test.local') and deleted_at is null");
        jdbc.update("update teams set deleted_at=current_timestamp where code in ('TEST-A','TEST-B') and deleted_at is null");
        jdbc.update("update users set deleted_at=current_timestamp where email like '%@test.local' and deleted_at is null");
        planner=createUser("planner", "ADMIN"); coordinator=createUser("coordinator", "COORDINADOR");
        supervisor=createUser("supervisor", "SUPERVISOR"); operator=createUser("operator", "OPERARIO");
        otherSupervisor=createUser("other-supervisor", "SUPERVISOR"); otherOperator=createUser("other-operator", "OPERARIO");
        team=team("TEST-A",supervisor); otherTeam=team("TEST-B",otherSupervisor);
        jdbc.update("insert into team_members(team_id,user_id) values (?,?),(?,?)",team,operator,otherTeam,otherOperator);
        typeId=jdbc.queryForObject("select id from catalog_items where parent_item_id is not null and is_active and deleted_at is null limit 1",Long.class);
        classId=jdbc.queryForObject("select parent_item_id from catalog_items where id=?",Long.class,typeId);
    }
    long createUser(String name,String role) {
        return jdbc.queryForObject("insert into users(email,password_hash,first_name,last_name,role_item_id) values (?,'test','Test',?,(select id from catalog_items where code=? and catalog_type_id=(select id from catalog_types where code='ROLE'))) returning id",Long.class,name+"@test.local",name,role);
    }
    long team(String code,long supervisorId) {
        return jdbc.queryForObject("insert into teams(code,name,supervisor_user_id) values (?,?,?) returning id",Long.class,code,code,supervisorId);
    }
    Map<String,Object> plan() {
        var body=new LinkedHashMap<String,Object>();
        body.put("classItemId",classId); body.put("typeItemId",typeId); body.put("scheduledDate","2026-10-23");
        body.put("locations",new ArrayList<>(List.of(location(-12.1,-77.1),location(-12.2,-77.2),location(-12.3,-77.3))));
        return body;
    }
    Map<String,Object> location(double lat,double lon) {
        return new LinkedHashMap<>(Map.of("clientReference",UUID.randomUUID().toString(),"location",Map.of("latitude",lat,"longitude",lon)));
    }
    JsonNode create(Map<String,Object> body,String key,int status) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/interventions").header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().is(status)).andReturn().getResponse().getContentAsString()).get("data");
    }
    @Test void createsThreeStableLocationsWithoutIncidentTables() throws Exception {
        var d=create(plan(),UUID.randomUUID().toString(),201);
        assertThat(d.get("locations").size()).isEqualTo(3);
        assertThat(d.get("statusCode").asString()).isEqualTo("PLANNED");
        assertThat(d.get("version").asLong()).isZero();
        assertThat(d.get("incidentIntegrationAvailable").asBoolean()).isFalse();
        assertThat(d.get("history").size()).isEqualTo(1);
        assertThat(d.get("completedAt").isNull()).isTrue();
        assertThat(java.time.Duration.between(java.time.Instant.parse(d.get("createdAt").asString()),java.time.Instant.now()).abs().getSeconds()).isLessThan(20);
    }
    @Test void idempotentRetryDoesNotDuplicateAndChangedBodyConflicts() throws Exception {
        var body=plan(); var key=UUID.randomUUID().toString(); var first=create(body,key,201);
        assertThat(create(body,key,200).get("id").asLong()).isEqualTo(first.get("id").asLong());
        body.put("description","different"); create(body,key,409);
        assertThat(jdbc.queryForObject("select count(*) from interventions where deleted_at is null",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from intervention_events e join interventions i on i.id=e.intervention_id where i.deleted_at is null",Integer.class)).isEqualTo(1);
    }
    @Test void requiresIdempotencyKeyAndValidLocation() throws Exception {
        mvc.perform(post("/api/v1/interventions").contentType("application/json").content(json.writeValueAsString(plan()))).andExpect(status().isBadRequest());
        var body=plan(); body.put("locations",List.of(Map.of("clientReference",UUID.randomUUID())));
        create(body,UUID.randomUUID().toString(),422);
        assertThat(jdbc.queryForObject("select count(*) from interventions where deleted_at is null",Integer.class)).isZero();
    }
    @Test void adminCannotAssignEvenWhenResourceIsVisible() throws Exception {
        var id=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        mvc.perform(post("/api/v1/interventions/"+id+"/assign").contentType("application/json").content(json.writeValueAsString(Map.of("version",0,"teamId",team,"assignedToUserId",operator)))).andExpect(status().isForbidden());
    }
    @Test void reorderingRetainsIdsAndRetirementIsSoft() throws Exception {
        var body=plan(); var first=create(body,UUID.randomUUID().toString(),201); long id=first.get("id").asLong();
        var locations=new ArrayList<Map<String,Object>>();
        for(var l:first.get("locations")) {
            locations.add(new LinkedHashMap<>(Map.of("id",l.get("id").asLong(),"clientReference",l.get("clientReference").asString(),"location",Map.of("latitude",l.get("location").get("latitude").asDouble(),"longitude",l.get("location").get("longitude").asDouble()))));
        }
        Collections.reverse(locations); var retired=locations.remove(0); body.put("locations",locations);body.put("version",0);
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1)).andExpect(jsonPath("$.data.locations",hasSize(2)));
        assertThat(jdbc.queryForObject("select deleted_at is not null from intervention_locations where id=?",Boolean.class,retired.get("id"))).isTrue();
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isConflict());
    }
    @Test void reschedulingRequiresReasonAndRecordsDates() throws Exception {
        var body=plan();long id=create(body,UUID.randomUUID().toString(),201).get("id").asLong();
        var refs=jdbc.queryForList("select id,client_reference from intervention_locations where intervention_id=? order by id",id);
        @SuppressWarnings("unchecked") var locations=(List<Map<String,Object>>)body.get("locations");
        for(int i=0;i<3;i++)locations.get(i).put("id",refs.get(i).get("id"));
        body.put("version",0);body.put("scheduledDate","2026-10-24");
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isUnprocessableEntity());
        body.put("rescheduleReason","Crew availability");
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select details->>'previousDate' from intervention_events where action_code='REPROGRAMMED' and intervention_id=?",String.class,id)).isEqualTo("2026-10-23");
    }
    @Test void corsAllowsIdempotencyHeader() throws Exception {
        mvc.perform(options("/api/v1/interventions").header("Origin","http://localhost:3000").header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","Content-Type,Idempotency-Key"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Headers",org.hamcrest.Matchers.containsString("Idempotency-Key")));
    }
    JsonNode assign(long id,long teamId,long assignee,String name,String role,long version,int expected) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/interventions/"+id+"/assign").with(user(name+"@test.local").authorities(()->role))
            .contentType("application/json").content(json.writeValueAsString(Map.of("version",version,"teamId",teamId,"assignedToUserId",assignee))))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).get("data");
    }
    long statusId(String code) {
        return jdbc.queryForObject("select i.id from catalog_items i join catalog_types t on t.id=i.catalog_type_id where t.code='INTERVENTION_STATUS' and i.code=?",Long.class,code);
    }
    @Test void coordinatorAssignsAllLocationsAndRejectsStaleVersionOrForeignMember() throws Exception {
        long id=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        assign(id,team,otherOperator,"coordinator","COORDINADOR",0,422);
        var assigned=assign(id,team,operator,"coordinator","COORDINADOR",0,200);
        assertThat(assigned.get("version").asLong()).isEqualTo(1);
        for(var l:assigned.get("locations"))assertThat(l.get("statusCode").asString()).isEqualTo("ASSIGNED");
        assign(id,team,operator,"coordinator","COORDINADOR",0,409);
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=?",Integer.class,id)).isEqualTo(2);
    }
    @Test void scopeDependsOnSupervisionRatherThanTeamMembership() throws Exception {
        long own=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        long foreign=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        assign(own,team,operator,"coordinator","COORDINADOR",0,200);
        assign(foreign,otherTeam,otherOperator,"coordinator","COORDINADOR",0,200);
        jdbc.update("insert into team_members(team_id,user_id) values (?,?)",otherTeam,supervisor);
        mvc.perform(get("/api/v1/interventions/"+own).with(user("supervisor@test.local").authorities(()->"SUPERVISOR"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/interventions/"+foreign).with(user("supervisor@test.local").authorities(()->"SUPERVISOR"))).andExpect(status().isNotFound());
        assign(foreign,team,operator,"supervisor","SUPERVISOR",1,404);
        assign(own,otherTeam,otherOperator,"supervisor","SUPERVISOR",1,403);
        assign(own,team,supervisor,"supervisor","SUPERVISOR",1,200);
        mvc.perform(get("/api/v1/interventions/options").with(user("supervisor@test.local").authorities(()->"SUPERVISOR")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.teams",hasSize(1))).andExpect(jsonPath("$.data.teams[0].id").value(team));
    }
    @Test void operatorOnlyReadsOwnAssignmentsAndScopeChangesOnNextRequest() throws Exception {
        long id=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        assign(id,team,operator,"coordinator","COORDINADOR",0,200);
        mvc.perform(get("/api/v1/interventions/"+id).with(user("operator@test.local").authorities(()->"OPERARIO"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/interventions/"+id).with(user("other-operator@test.local").authorities(()->"OPERARIO"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/interventions").with(user("other-operator@test.local").authorities(()->"OPERARIO"))).andExpect(status().isOk()).andExpect(jsonPath("$.data.content",hasSize(0)));
        jdbc.update("update teams set supervisor_user_id=? where id=?",otherSupervisor,team);
        mvc.perform(get("/api/v1/interventions/"+id).with(user("supervisor@test.local").authorities(()->"SUPERVISOR"))).andExpect(status().isNotFound());
    }
    @Test void currentDatabaseRoleAndActiveAccountOverrideOldTokenPrivileges() throws Exception {
        jdbc.update("update users set role_item_id=(select id from catalog_items where code='OPERARIO' and catalog_type_id=(select id from catalog_types where code='ROLE')) where id=?",planner);
        create(plan(),UUID.randomUUID().toString(),403);
        jdbc.update("update users set is_active=false where id=?",planner);
        mvc.perform(get("/api/v1/interventions")).andExpect(status().isUnauthorized());
    }
    @Test void invalidLastLocationRollsBackHeaderChildrenEventsAndSubmission() throws Exception {
        var body=plan();
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)body.get("locations");
        rows.get(2).put("zoneId",Long.MAX_VALUE);
        create(body,UUID.randomUUID().toString(),422);
        assertThat(jdbc.queryForObject("select count(*) from interventions where created_by_user_id=?",Integer.class,planner)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from intervention_submissions where actor_user_id=?",Integer.class,planner)).isZero();
    }
    @Test void classHierarchyAndFindingSourceAreValidated() throws Exception {
        var body=plan();body.put("classItemId",jdbc.queryForObject("select id from catalog_items where catalog_type_id=(select id from catalog_types where code='INTERVENTION_CLASS') and id<>? limit 1",Long.class,classId));
        create(body,UUID.randomUUID().toString(),422);
        body=plan();body.remove("typeItemId");create(body,UUID.randomUUID().toString(),422);
        body=plan();body.put("originItemId",jdbc.queryForObject("select id from catalog_items where code='FINDING' and catalog_type_id=(select id from catalog_types where code='INTERVENTION_ORIGIN')",Long.class));
        create(body,UUID.randomUUID().toString(),422);
    }
    @Test void pointAndQuantityValidationReturnClientErrors() throws Exception {
        var body=plan();body.put("locations",List.of(location(91,-77)));create(body,UUID.randomUUID().toString(),400);
        var l=location(-12,-77);l.put("requestedQuantity",1);body.put("locations",List.of(l));create(body,UUID.randomUUID().toString(),422);
        l.put("requestedQuantity",-1);create(body,UUID.randomUUID().toString(),400);
        mvc.perform(post("/api/v1/interventions").header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"locations\":[{\"clientReference\":\"bad-uuid\"}]}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.ok").value(false));
    }
    @Test void filtersMatchSameLocationAndPaginationDoesNotDuplicateWorks() throws Exception {
        var zoneIds=jdbc.queryForList("select id from zones where deleted_at is null and is_active order by id limit 2",Long.class);
        var element=jdbc.queryForObject("select id from green_elements where deleted_at is null and is_active limit 1",Long.class);
        var body=plan();
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)body.get("locations");
        rows.get(0).put("zoneId",zoneIds.get(0));rows.get(1).put("zoneId",zoneIds.get(1));rows.get(1).put("elementIds",List.of(element));rows.get(2).put("zoneId",zoneIds.get(1));
        create(body,UUID.randomUUID().toString(),201);
        mvc.perform(get("/api/v1/interventions").param("zoneId",zoneIds.get(0).toString()).param("greenElementId",element.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.content",hasSize(0)));
        mvc.perform(get("/api/v1/interventions").param("zoneId",zoneIds.get(1).toString()).param("size","1").param("dateFrom","2026-10-23"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.content",hasSize(1))).andExpect(jsonPath("$.data.page.totalElements").value(1));
        mvc.perform(get("/api/v1/interventions").param("sort","description,desc")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/interventions").param("incidentId","1")).andExpect(status().isUnprocessableEntity());
    }
    @Test void aggregateStatusAndUnitsAreDerivedBeforeFiltering() throws Exception {
        var body=plan();
        long unit=jdbc.queryForObject("select id from catalog_items where code='UNIT' and catalog_type_id=(select id from catalog_types where code='MEASUREMENT_UNIT')",Long.class);
        long m2=jdbc.queryForObject("select id from catalog_items where code='M2' and catalog_type_id=(select id from catalog_types where code='MEASUREMENT_UNIT')",Long.class);
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)body.get("locations");
        rows.get(0).put("unitItemId",unit);rows.get(0).put("requestedQuantity",2);
        rows.get(1).put("unitItemId",unit);rows.get(1).put("requestedQuantity",3);
        rows.get(2).put("unitItemId",m2);rows.get(2).put("requestedQuantity",10);
        long id=create(body,UUID.randomUUID().toString(),201).get("id").asLong();assign(id,team,operator,"coordinator","COORDINADOR",0,200);
        var local=jdbc.queryForList("select id from intervention_locations where intervention_id=? order by id",Long.class,id);
        jdbc.update("update intervention_locations set status_item_id=?,started_at=current_timestamp,completed_at=current_timestamp,attempt_number=1,executed_by_user_id=?,executed_quantity=2 where id=?",statusId("COMPLETED"),operator,local.get(0));
        jdbc.update("update intervention_locations set status_item_id=?,started_at=current_timestamp,attempt_number=1,executed_by_user_id=?,progress_quantity=1 where id=?",statusId("IN_PROGRESS"),operator,local.get(1));
        mvc.perform(get("/api/v1/interventions").param("statusCode","IN_PROGRESS").param("size","1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.totalElements").value(1)).andExpect(jsonPath("$.data.content[0].completedLocationCount").value(1));
        mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.quantityTotals",hasSize(2)))
            .andExpect(jsonPath("$.data.quantityTotals[0].requestedQuantity").value(5)).andExpect(jsonPath("$.data.quantityTotals[0].executedQuantity").isEmpty())
            .andExpect(jsonPath("$.data.completedAt").isEmpty());
        var actualStart=jdbc.queryForObject("select min(started_at) from intervention_locations where intervention_id=?",java.time.LocalDateTime.class,id).toInstant(java.time.ZoneOffset.UTC);
        var list=json.readTree(mvc.perform(get("/api/v1/interventions").param("statusCode","IN_PROGRESS")).andReturn().getResponse().getContentAsString());
        var detail=json.readTree(mvc.perform(get("/api/v1/interventions/"+id)).andReturn().getResponse().getContentAsString());
        assertThat(java.time.Instant.parse(list.get("data").get("content").get(0).get("startedAt").asString())).isEqualTo(actualStart);
        assertThat(java.time.Instant.parse(detail.get("data").get("startedAt").asString())).isEqualTo(actualStart);
        assign(id,team,operator,"coordinator","COORDINADOR",1,422);
        mvc.perform(post("/api/v1/interventions/"+id+"/cancel").contentType("application/json").content("{\"version\":1,\"reason\":\"Stop\"}")).andExpect(status().isUnprocessableEntity());
        jdbc.update("update intervention_locations set status_item_id=?,started_at=coalesce(started_at,current_timestamp),completed_at=current_timestamp,attempt_number=1,executed_by_user_id=? where intervention_id=?",statusId("COMPLETED"),operator,id);
        mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.statusCode").value("COMPLETED")).andExpect(jsonPath("$.data.completedAt").isNotEmpty());
        jdbc.update("update intervention_locations set status_item_id=? where id=?",statusId("OBSERVED"),local.get(0));
        mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.statusCode").value("OBSERVED")).andExpect(jsonPath("$.data.completedAt").isEmpty());
        jdbc.update("update intervention_locations set status_item_id=?,validated_at=current_timestamp,validated_by_user_id=? where intervention_id=?",statusId("VALIDATED"),coordinator,id);
        mvc.perform(get("/api/v1/interventions").param("statusCode","VALIDATED")).andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].validatedLocationCount").value(3));
    }
    @Test void cancellationPreservesLocationsAndReason() throws Exception {
        long id=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        mvc.perform(post("/api/v1/interventions/"+id+"/cancel").contentType("application/json").content("{\"version\":0,\"reason\":\"Rescheduled campaign\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.statusCode").value("CANCELLED")).andExpect(jsonPath("$.data.locations",hasSize(3)))
            .andExpect(jsonPath("$.data.locations[0].statusCode").value("CANCELLED")).andExpect(jsonPath("$.data.history[1].reason").value("Rescheduled campaign"));
    }
    @Test void concurrentCommandsWithSameVersionCannotBothSucceed() throws Exception {
        long id=create(plan(),UUID.randomUUID().toString(),201).get("id").asLong();
        var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Integer> command=()->{start.await();return mvc.perform(post("/api/v1/interventions/"+id+"/cancel").with(user("planner@test.local").authorities(()->"ADMIN"))
                .contentType("application/json").content("{\"version\":0,\"reason\":\"Concurrent edit\"}")).andReturn().getResponse().getStatus();};
            var a=pool.submit(command);var b=pool.submit(command);start.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='CANCELLED'",Integer.class,id)).isEqualTo(1);
    }
    Map<String,Object> editableBody(JsonNode detail) {
        var body=new LinkedHashMap<String,Object>();body.put("classItemId",detail.get("classItemId").asLong());body.put("typeItemId",detail.get("typeItemId").asLong());
        body.put("scheduledDate",detail.get("scheduledDate").asString());body.put("version",detail.get("version").asLong());
        var rows=new ArrayList<Map<String,Object>>();
        for(var l:detail.get("locations"))rows.add(new LinkedHashMap<>(Map.of("id",l.get("id").asLong(),"clientReference",l.get("clientReference").asString(),
            "location",Map.of("latitude",l.get("location").get("latitude").asDouble(),"longitude",l.get("location").get("longitude").asDouble()))));
        body.put("locations",rows);return body;
    }
    @Test void retiredReferencesCannotBeReusedAndFailedEditIsAtomic() throws Exception {
        var first=create(plan(),UUID.randomUUID().toString(),201);long id=first.get("id").asLong();var body=editableBody(first);
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)body.get("locations");
        var removed=rows.remove(2);
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
        removed.remove("id");rows.add(removed);body.put("version",1);body.put("description","Should roll back");
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1))
            .andExpect(jsonPath("$.data.description").isEmpty()).andExpect(jsonPath("$.data.locations",hasSize(2))).andExpect(jsonPath("$.data.history",hasSize(2)));
    }
    @Test void inactiveCatalogReferencesRemainReadableAndUnchangedEditable() throws Exception {
        var first=create(plan(),UUID.randomUUID().toString(),201);long id=first.get("id").asLong();
        jdbc.update("update catalog_items set is_active=false where id=?",typeId);
        try {
            mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.typeItemId").value(typeId));
            mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(editableBody(first)))).andExpect(status().isOk());
            create(plan(),UUID.randomUUID().toString(),422);
        } finally {jdbc.update("update catalog_items set is_active=true where id=?",typeId);}
    }
    @Test void expiredSubmissionCanBeReusedWithoutDeletingOldWork() throws Exception {
        var body=plan();var key=UUID.randomUUID().toString();var first=create(body,key,201);
        jdbc.update("update intervention_submissions set expires_at=current_timestamp-interval '25 hours' where actor_user_id=? and idempotency_key=?",planner,UUID.fromString(key));
        var next=create(body,key,201);assertThat(next.get("id").asLong()).isNotEqualTo(first.get("id").asLong());
        assertThat(jdbc.queryForObject("select count(*) from interventions where created_by_user_id=? and deleted_at is null",Integer.class,planner)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from intervention_submissions where actor_user_id=? and deleted_at is null",Integer.class,planner)).isEqualTo(1);
    }
    @Test void concurrentCreateAndRetryProduceOneAggregate() throws Exception {
        String content=json.writeValueAsString(plan());String key=UUID.randomUUID().toString();var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Integer> command=()->{start.await();return mvc.perform(post("/api/v1/interventions").with(user("planner@test.local").authorities(()->"ADMIN"))
                .header("Idempotency-Key",key).contentType("application/json").content(content)).andReturn().getResponse().getStatus();};
            var a=pool.submit(command);var b=pool.submit(command);start.countDown();var results=List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS));
            assertThat(results).contains(201);assertThat(results).allMatch(s->Set.of(200,201,409).contains(s));
        }
        mvc.perform(post("/api/v1/interventions").header("Idempotency-Key",key).contentType("application/json").content(content)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from interventions where created_by_user_id=?",Integer.class,planner)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from intervention_locations l join interventions i on i.id=l.intervention_id where i.created_by_user_id=?",Integer.class,planner)).isEqualTo(3);
    }
    @Test void minimumLocationAndDuplicateElementsAreValidated() throws Exception {
        var body=plan();body.put("locations",List.of());create(body,UUID.randomUUID().toString(),400);
        var element=jdbc.queryForObject("select id from green_elements where deleted_at is null and is_active limit 1",Long.class);
        var l=location(-12,-77);l.put("elementIds",List.of(element,element));body.put("locations",List.of(l));create(body,UUID.randomUUID().toString(),400);
        var first=create(plan(),UUID.randomUUID().toString(),201);var edit=editableBody(first);edit.put("locations",List.of());
        mvc.perform(put("/api/v1/interventions/"+first.get("id").asLong()).contentType("application/json").content(json.writeValueAsString(edit))).andExpect(status().isBadRequest());
    }

    JsonNode localCommand(long id,long locationId,String action,String name,String role,Map<String,Object> body,int expected) throws Exception {
        var request=action.equals("execution")?put("/api/v1/interventions/"+id+"/locations/"+locationId+"/execution")
            :post("/api/v1/interventions/"+id+"/locations/"+locationId+"/"+action);
        return json.readTree(mvc.perform(request.with(user(name+"@test.local").authorities(()->role))
            .contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).get("data");
    }
    JsonNode assignedPlan(boolean quantities) throws Exception {
        var body=plan();
        if(quantities){
            long unit=jdbc.queryForObject("select id from catalog_items where code='UNIT' and catalog_type_id=(select id from catalog_types where code='MEASUREMENT_UNIT')",Long.class);
            @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)body.get("locations");
            for(var row:rows){row.put("unitItemId",unit);row.put("requestedQuantity",2);}
        }
        long id=create(body,UUID.randomUUID().toString(),201).get("id").asLong();
        return assign(id,team,operator,"coordinator","COORDINADOR",0,200);
    }
    @Test void startingOneLocationKeepsOtherLocationsAssignedAndRecordsRealActor() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        var started=localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        assertThat(started.get("version").asLong()).isEqualTo(2);
        assertThat(started.get("planningStatusCode").asString()).isEqualTo("ASSIGNED");
        assertThat(started.get("statusCode").asString()).isEqualTo("IN_PROGRESS");
        var location=started.get("locations").get(0);
        assertThat(location.get("executedByUserId").asLong()).isEqualTo(operator);
        assertThat(location.get("attemptNumber").asInt()).isEqualTo(1);
        assertThat(location.get("startedAt").isNull()).isFalse();
        assertThat(location.get("executedQuantity").isNull()).isTrue();
        assertThat(started.get("locations").get(1).get("statusCode").asString()).isEqualTo("ASSIGNED");
        assertThat(started.get("locations").get(2).get("startedAt").isNull()).isTrue();
        var event=started.get("history").get(2);
        assertThat(event.get("actionCode").asString()).isEqualTo("STARTED");
        assertThat(event.get("interventionLocationId").asLong()).isEqualTo(a);
        assertThat(event.get("actorUserId").asLong()).isEqualTo(operator);
        assertThat(event.get("fromStatusCode").asString()).isEqualTo("ASSIGNED");
        assertThat(event.get("toStatusCode").asString()).isEqualTo("IN_PROGRESS");
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),409);
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",2),422);
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='STARTED'",Integer.class,id)).isEqualTo(1);
    }
    @Test void responsibleSupervisorCanReportWithoutReplacingActualExecutor() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong(),b=d.get("locations").get(1).get("id").asLong();
        localCommand(id,a,"start","supervisor","SUPERVISOR",Map.of("version",1),200);
        localCommand(id,b,"start","operator","OPERARIO",Map.of("version",2),200);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",3,"progressQuantity",1),403);
        localCommand(id,b,"execution","other-supervisor","SUPERVISOR",Map.of("version",3,"progressQuantity",1),404);
        localCommand(id,a,"execution","supervisor","SUPERVISOR",Map.of("version",3,"progressQuantity",1,"executionNotes","Garden A"),200);
        var result=localCommand(id,b,"execution","supervisor","SUPERVISOR",Map.of("version",4,"progressQuantity",3,"executionNotes","Garden B"),200);
        assertThat(result.get("locations").get(0).get("progressQuantity").asInt()).isEqualTo(1);
        assertThat(result.get("locations").get(1).get("progressQuantity").asInt()).isEqualTo(3);
        assertThat(result.get("locations").get(0).get("executedByUserId").asLong()).isEqualTo(supervisor);
        assertThat(result.get("locations").get(1).get("executedByUserId").asLong()).isEqualTo(operator);
        assertThat(result.get("locations").get(2).get("progressQuantity").isNull()).isTrue();
        assertThat(result.get("completedLocationCount").asInt()).isZero();
        assertThat(result.get("completedAt").isNull()).isTrue();
        for(var l:result.get("locations"))assertThat(l.get("executedQuantity").isNull()).isTrue();
    }
    @Test void localExecutionRequiresRoleScopeMembershipAndCurrentAccount() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"start","planner","ADMIN",Map.of("version",1),403);
        localCommand(id,a,"start","coordinator","COORDINADOR",Map.of("version",1),403);
        localCommand(id,a,"start","other-operator","OPERARIO",Map.of("version",1),404);
        localCommand(id,a,"start","other-supervisor","SUPERVISOR",Map.of("version",1),404);
        jdbc.update("update team_members set left_at=current_timestamp where team_id=? and user_id=? and deleted_at is null",team,operator);
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),403);
        jdbc.update("update team_members set left_at=null where team_id=? and user_id=? and deleted_at is null",team,operator);
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        jdbc.update("update users set role_item_id=(select id from catalog_items where code='COORDINADOR' and catalog_type_id=(select id from catalog_types where code='ROLE')) where id=?",operator);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",1),403);
        jdbc.update("update users set is_active=false where id=?",operator);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",1),401);
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(2);
    }
    @Test void localLocationMustBelongToWorkAndBeActive() throws Exception {
        var one=assignedPlan(true);var two=assignedPlan(true);
        long id=one.get("id").asLong(),foreign=two.get("locations").get(0).get("id").asLong(),own=one.get("locations").get(0).get("id").asLong();
        localCommand(id,foreign,"start","supervisor","SUPERVISOR",Map.of("version",1),404);
        localCommand(id,foreign,"execution","supervisor","SUPERVISOR",Map.of("version",1,"progressQuantity",1),404);
        jdbc.update("update intervention_locations set deleted_at=current_timestamp where id=?",own);
        localCommand(id,own,"start","supervisor","SUPERVISOR",Map.of("version",1),404);
    }
    @Test void progressNeedsStartedLocationAndUnitAndValidDecimal() throws Exception {
        var d=assignedPlan(false);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",1,"progressQuantity",1),422);
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",1),422);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",-1),400);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",0.0001),400);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"executionNotes","x".repeat(4001)),400);
        var notes=localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"executionNotes","Inspected without quantity"),200);
        assertThat(notes.get("locations").get(0).get("progressQuantity").isNull()).isTrue();
        assertThat(notes.get("locations").get(0).get("executionNotes").asString()).isEqualTo("Inspected without quantity");
        assertThat(notes.get("version").asLong()).isEqualTo(3);
    }
    @Test void progressPreservesStartAndFinalFieldsAndRecordsPreviousValues() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        var started=localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",1.125,"executionNotes","First pass"),200);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",2),409);
        var changed=localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",3,"progressQuantity",0,"executionNotes","Corrected progress"),200);
        var l=changed.get("locations").get(0);
        assertThat(l.get("startedAt").asString()).isEqualTo(started.get("locations").get(0).get("startedAt").asString());
        assertThat(l.get("attemptNumber").asInt()).isEqualTo(1);
        assertThat(l.get("progressQuantity").asInt()).isZero();
        assertThat(l.get("requestedQuantity").asInt()).isEqualTo(2);
        assertThat(l.get("executedQuantity").isNull()).isTrue();
        assertThat(l.get("completedAt").isNull()).isTrue();
        assertThat(l.get("validatedAt").isNull()).isTrue();
        var history=jdbc.queryForList("select details->'previous'->>'progressQuantity' previous,details->'current'->>'progressQuantity' current from intervention_events where intervention_id=? and action_code='PROGRESS_SAVED' order by id",id);
        assertThat(history).hasSize(2);
        assertThat(new java.math.BigDecimal((String)history.get(1).get("previous"))).isEqualByComparingTo("1.125");
        assertThat(new java.math.BigDecimal((String)history.get(1).get("current"))).isEqualByComparingTo("0");
    }
    @Test void startClosesPlanningAndCompletionRequiresAReport() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        var edit=editableBody(d);edit.put("version",2);
        mvc.perform(put("/api/v1/interventions/"+id).contentType("application/json").content(json.writeValueAsString(edit))).andExpect(status().isUnprocessableEntity());
        assign(id,team,operator,"coordinator","COORDINADOR",2,422);
        mvc.perform(post("/api/v1/interventions/"+id+"/cancel").contentType("application/json").content("{\"version\":2,\"reason\":\"No longer allowed\"}")).andExpect(status().isUnprocessableEntity());
        localCommand(id,a,"complete","operator","OPERARIO",Map.of("version",2),400);
        mvc.perform(post("/api/v1/interventions/"+id+"/start").with(user("operator@test.local").authorities(()->"OPERARIO")).contentType("application/json").content("{\"version\":2}")).andExpect(status().isNotFound());
    }
    @Test void observedLocationCannotBeReopenedThroughStart() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        jdbc.update("update intervention_locations set status_item_id=? where id=?",statusId("OBSERVED"),a);
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),422);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",1,"progressQuantity",1),422);
        assertThat(jdbc.queryForObject("select attempt_number from intervention_locations where id=?",Integer.class,a)).isZero();
    }
    @Test void concurrentStartsOfDifferentLocationsUseCommonVersionWithoutLosingState() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong(),b=d.get("locations").get(1).get("id").asLong();
        var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var requests=new ArrayList<Future<Integer>>();
            for(long location:List.of(a,b))requests.add(pool.submit(()->{gate.await();return mvc.perform(post("/api/v1/interventions/"+id+"/locations/"+location+"/start")
                .with(user("operator@test.local").authorities(()->"OPERARIO")).contentType("application/json").content("{\"version\":1}")).andReturn().getResponse().getStatus();}));
            gate.countDown();assertThat(List.of(requests.get(0).get(15,TimeUnit.SECONDS),requests.get(1).get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("select count(*) from intervention_locations where intervention_id=? and started_at is not null",Integer.class,id)).isEqualTo(1);
        long remaining=jdbc.queryForObject("select id from intervention_locations where id in (?,?) and started_at is null",Long.class,a,b);
        var retried=localCommand(id,remaining,"start","operator","OPERARIO",Map.of("version",2),200);
        assertThat(retried.get("version").asLong()).isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from intervention_locations where intervention_id=? and started_at is not null",Integer.class,id)).isEqualTo(2);
    }
    @Test void localCommandsRequireCurrentNonnegativeVersion() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"start","operator","OPERARIO",Map.of(),400);
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",-1),400);
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("progressQuantity",1),400);
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(1);
    }
    @Test void failedLocalEventRollsBackQuantityAndVersion() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        // Fault injection exists only in this class's disposable database.
        jdbc.execute("""
            create function test_reject_intervention_progress() returns trigger language plpgsql as $$
            begin
              if new.action_code='PROGRESS_SAVED' then raise exception 'Injected event persistence failure'; end if;
              return new;
            end; $$
            """);
        jdbc.execute("create trigger test_reject_intervention_progress before insert on intervention_events for each row execute function test_reject_intervention_progress()");
        try {
            localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",1,"executionNotes","Must roll back"),500);
            assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(2);
            assertThat(jdbc.queryForObject("select progress_quantity is null and execution_notes is null from intervention_locations where id=?",Boolean.class,a)).isTrue();
            assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='PROGRESS_SAVED'",Integer.class,id)).isZero();
        } finally {
            jdbc.execute("drop trigger test_reject_intervention_progress on intervention_events");
            jdbc.execute("drop function test_reject_intervention_progress()");
        }
        localCommand(id,a,"execution","operator","OPERARIO",Map.of("version",2,"progressQuantity",1),200);
    }
    @Test void simultaneousProgressSavesDoNotOverwriteEachOther() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"start","operator","OPERARIO",Map.of("version",1),200);
        var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var results=new ArrayList<Future<Integer>>();
            for(int quantity:List.of(1,2))results.add(pool.submit(()->{gate.await();return mvc.perform(put("/api/v1/interventions/"+id+"/locations/"+a+"/execution")
                .with(user("operator@test.local").authorities(()->"OPERARIO")).contentType("application/json")
                .content(json.writeValueAsString(Map.of("version",2,"progressQuantity",quantity)))).andReturn().getResponse().getStatus();}));
            gate.countDown();assertThat(List.of(results.get(0).get(15,TimeUnit.SECONDS),results.get(1).get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(3);
        assertThat(jdbc.queryForObject("select progress_quantity from intervention_locations where id=?",java.math.BigDecimal.class,a)).isIn(new java.math.BigDecimal("1.000"),new java.math.BigDecimal("2.000"));
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='PROGRESS_SAVED'",Integer.class,id)).isEqualTo(1);
    }

    Map<String,Object> evidenceBody(JsonNode d,int locationIndex,long version) {
        return new LinkedHashMap<>(Map.of("version",version,"interventionLocationId",d.get("locations").get(locationIndex).get("id").asLong(),
            "clientReference",UUID.randomUUID().toString(),"momentCode","BEFORE","caption","Specific garden"));
    }
    JsonNode announce(long id,Map<String,Object> body,String key,String name,String role,int expected) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/interventions/"+id+"/evidences").with(user(name+"@test.local").authorities(()->role))
            .header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).get("data");
    }
    JsonNode upload(long id,long evidence,byte[] bytes,String name,String role,int expected) throws Exception {
        return json.readTree(mvc.perform(multipart("/api/v1/interventions/"+id+"/evidences/"+evidence+"/file")
            .file(new MockMultipartFile("file","phone.png","image/jpeg",bytes)).with(r->{r.setMethod("PUT");return r;})
            .with(user(name+"@test.local").authorities(()->role)))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).get("data");
    }
    JsonNode startedPlan() throws Exception {
        var d=assignedPlan(true);return localCommand(d.get("id").asLong(),d.get("locations").get(0).get("id").asLong(),"start","operator","OPERARIO",Map.of("version",1),200);
    }
    byte[] image(String format,int color) throws Exception {
        var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);image.setRGB(0,0,color);
        var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,format,out);return out.toByteArray();
    }
    @Test void announcesPendingPhotoAndUploadsOriginalBytesWithAuthorizedPrivateRead() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);
        var e=announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",201);long photo=e.get("id").asLong();
        assertThat(e.get("fileUrl").isNull()).isTrue();assertThat(e.get("uploadedAt").isNull()).isTrue();
        mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.pendingEvidenceCount").value(1))
            .andExpect(jsonPath("$.data.locations[0].pendingEvidenceCount").value(1)).andExpect(jsonPath("$.data.locations[1].pendingEvidenceCount").value(0));
        mvc.perform(get("/api/v1/interventions/"+id+"/evidences/"+photo+"/file")).andExpect(status().isConflict());
        byte[] png=image("png",0x22aa11);var received=upload(id,photo,png,"operator","OPERARIO",200);
        assertThat(received.get("interventionVersion").asLong()).isEqualTo(4);assertThat(received.get("uploadedAt").isNull()).isFalse();
        String path=received.get("fileUrl").asString();
        mvc.perform(get(path)).andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(content().bytes(png))
            .andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store"))).andExpect(header().string("X-Content-Type-Options","nosniff"));
        mvc.perform(get(path).with(user("other-operator@test.local").authorities(()->"OPERARIO"))).andExpect(status().isNotFound());
        mvc.perform(get(path).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.data.pendingEvidenceCount").value(0)).andExpect(jsonPath("$.data.evidences[0].fileUrl").value(path));
    }
    @Test void announcementRetriesKeepPermanentReferenceAndRejectChangedMetadata() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);String key=UUID.randomUUID().toString();
        var e=announce(id,body,key,"operator","OPERARIO",201);
        assertThat(announce(id,body,key,"operator","OPERARIO",200).get("id").asLong()).isEqualTo(e.get("id").asLong());
        body.put("version",3);
        assertThat(announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",200).get("id").asLong()).isEqualTo(e.get("id").asLong());
        body.put("caption","Changed metadata");announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",409);
        announce(id,body,key,"operator","OPERARIO",409);
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from intervention_evidences where intervention_id=?",Integer.class,id)).isEqualTo(1);
    }
    @Test void photoCannotMoveBetweenLocationsWorksOrAuthors() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong(),b=d.get("locations").get(1).get("id").asLong();var body=evidenceBody(d,0,2);
        long originalPhoto=announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        localCommand(id,b,"start","supervisor","SUPERVISOR",Map.of("version",3),200);
        body.put("version",4);body.put("interventionLocationId",b);announce(id,body,UUID.randomUUID().toString(),"supervisor","SUPERVISOR",409);
        var other=startedPlan();body.put("version",2);body.put("interventionLocationId",other.get("locations").get(0).get("id").asLong());
        announce(other.get("id").asLong(),body,UUID.randomUUID().toString(),"operator","OPERARIO",409);
        upload(other.get("id").asLong(),originalPhoto,image("png",1),"operator","OPERARIO",404);
        mvc.perform(get("/api/v1/interventions/"+other.get("id").asLong()+"/evidences/"+originalPhoto+"/file")).andExpect(status().isNotFound());
    }
    @Test void evidenceElementMustBelongToSpecificLocation() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong(),b=d.get("locations").get(1).get("id").asLong();
        long element=jdbc.queryForObject("select id from green_elements where is_active and deleted_at is null limit 1",Long.class);
        jdbc.update("insert into intervention_elements(intervention_id,intervention_location_id,green_element_id) values (?,?,?)",id,a,element);
        var body=evidenceBody(d,0,2);body.put("greenElementId",element);announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",201);
        localCommand(id,b,"start","operator","OPERARIO",Map.of("version",3),200);
        var other=evidenceBody(d,1,4);other.put("greenElementId",element);announce(id,other,UUID.randomUUID().toString(),"operator","OPERARIO",422);
    }
    @Test void photoUploadRequiresOriginalAuthorAndCurrentExecutionPermissions() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);byte[] png=image("png",1);
        announce(id,body,UUID.randomUUID().toString(),"planner","ADMIN",403);
        announce(id,body,UUID.randomUUID().toString(),"other-supervisor","SUPERVISOR",404);
        long photo=announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        upload(id,photo,png,"supervisor","SUPERVISOR",403);upload(id,photo,png,"other-operator","OPERARIO",404);
        jdbc.update("update team_members set left_at=current_timestamp where team_id=? and user_id=?",team,operator);
        upload(id,photo,png,"operator","OPERARIO",403);
        jdbc.update("update team_members set left_at=null where team_id=? and user_id=?",team,operator);
        jdbc.update("update users set role_item_id=(select id from catalog_items where code='COORDINADOR' and catalog_type_id=(select id from catalog_types where code='ROLE')) where id=?",operator);
        upload(id,photo,png,"operator","OPERARIO",403);
    }
    @Test void fileRetryDoesNotWriteAgainAndDifferentBytesConflict() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();long photo=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        byte[] png=image("png",1);var first=upload(id,photo,png,"operator","OPERARIO",200);
        clearInvocations(storage);
        var retried=upload(id,photo,png,"operator","OPERARIO",200);assertThat(retried).isEqualTo(first);
        upload(id,photo,image("png",2),"operator","OPERARIO",409);
        verify(storage,never()).put(anyString(),any(byte[].class),anyString());verify(storage,never()).delete(anyString());
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='EVIDENCE_UPLOADED'",Integer.class,id)).isEqualTo(1);
    }
    @Test void rejectsSpoofedUnsupportedEmptyOversizedAndUnreadableFiles() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();long photo=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        for(byte[] invalid:List.of("<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes(),image("gif",1),new byte[]{(byte)255,(byte)216,(byte)255,0},new byte[0]))upload(id,photo,invalid,"operator","OPERARIO",400);
        upload(id,photo,new byte[25*1024*1024+1],"operator","OPERARIO",400);
        mvc.perform(put("/api/v1/interventions/"+id+"/evidences/"+photo+"/file").with(user("operator@test.local").authorities(()->"OPERARIO"))
            .contentType("application/octet-stream").content(image("png",1))).andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.ok").value(false));
        verify(storage,never()).put(anyString(),any(byte[].class),anyString());
        assertThat(jdbc.queryForObject("select uploaded_at is null from intervention_evidences where id=?",Boolean.class,photo)).isTrue();
    }
    @Test void acceptsJpegAndWebpByContent() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();long version=2;
        byte[] webp=Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA");
        for(byte[] bytes:List.of(image("jpeg",0x228811),webp)){
            var body=evidenceBody(d,0,version);body.put("momentCode","AFTER");
            long photo=announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();version++;
            upload(id,photo,bytes,"operator","OPERARIO",200);version++;
        }
    }
    @Test void pendingUploadDoesNotAssumePermissionAfterValidationButReceivedRetrySurvivesStateChange() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        var first=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201);long photo=first.get("id").asLong();
        byte[] png=image("png",3);upload(id,photo,png,"operator","OPERARIO",200);
        long pending=announce(id,evidenceBody(d,0,4),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        jdbc.update("update intervention_locations set status_item_id=? where id=?",statusId("VALIDATED"),a);
        upload(id,pending,png,"operator","OPERARIO",422);upload(id,photo,png,"operator","OPERARIO",200);
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(5);
    }
    @Test void databaseFailureDeletesOnlyNewObjectAndLeavesEvidencePendingForRetry() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();
        long accepted=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        byte[] previous=image("png",5);upload(id,accepted,previous,"operator","OPERARIO",200);
        long photo=announce(id,evidenceBody(d,0,4),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        byte[] png=image("png",7);
        jdbc.execute("create function test_reject_evidence_upload() returns trigger language plpgsql as $$ begin if new.action_code='EVIDENCE_UPLOADED' then raise exception 'Injected evidence event failure'; end if; return new; end; $$");
        jdbc.execute("create trigger test_reject_evidence_upload before insert on intervention_events for each row execute function test_reject_evidence_upload()");
        clearInvocations(storage);
        try {
            upload(id,photo,png,"operator","OPERARIO",500);
            var key=org.mockito.ArgumentCaptor.forClass(String.class);verify(storage).put(key.capture(),any(byte[].class),eq("image/png"));verify(storage).delete(key.getValue());
            assertThat(org.assertj.core.api.Assertions.catchThrowable(()->storage.read(key.getValue()))).isInstanceOf(StoredFileNotFoundException.class);
            assertThat(jdbc.queryForObject("select uploaded_at is null and storage_key is null from intervention_evidences where id=?",Boolean.class,photo)).isTrue();
            assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(5);
            mvc.perform(get("/api/v1/interventions/"+id+"/evidences/"+accepted+"/file")).andExpect(status().isOk()).andExpect(content().bytes(previous));
        } finally {jdbc.execute("drop trigger test_reject_evidence_upload on intervention_events");jdbc.execute("drop function test_reject_evidence_upload()");}
        upload(id,photo,png,"operator","OPERARIO",200);
    }
    @Test void simultaneousAnnouncementsWithSameReferenceDoNotDuplicate() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);String key=UUID.randomUUID().toString(),content=json.writeValueAsString(body);var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Integer> action=()->{gate.await();return mvc.perform(post("/api/v1/interventions/"+id+"/evidences").with(user("operator@test.local").authorities(()->"OPERARIO"))
                .header("Idempotency-Key",key).contentType("application/json").content(content)).andReturn().getResponse().getStatus();};
            var a=pool.submit(action);var b=pool.submit(action);gate.countDown();var results=List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS));
            assertThat(results).contains(201);assertThat(results).allMatch(s->Set.of(200,201,409).contains(s));
        }
        announce(id,body,key,"operator","OPERARIO",200);
        assertThat(jdbc.queryForObject("select count(*) from intervention_evidences where intervention_id=?",Integer.class,id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(3);
    }
    @Test void expiredEvidenceSubmitPreservesGpsMetadataAndPermanentReference() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);String key=UUID.randomUUID().toString();
        body.put("capturedAt","2026-10-22T16:00:00.123456789Z");body.put("capturedLocation",Map.of("latitude",-12.123456789012345,"longitude",-77.12345678901234));
        long photo=announce(id,body,key,"operator","OPERARIO",201).get("id").asLong();
        jdbc.update("update intervention_submissions set expires_at=current_timestamp-interval '25 hours' where actor_user_id=? and operation='EVIDENCE_ANNOUNCE'",operator);
        assertThat(announce(id,body,key,"operator","OPERARIO",200).get("id").asLong()).isEqualTo(photo);
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(3);
        jdbc.update("update intervention_evidences set deleted_at=current_timestamp where id=?",photo);
        announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",409);
    }
    @Test void partialStorageFailureKeepsAnnouncementAndCleansOnlyAttemptedObject() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();long photo=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        var attempted=new java.util.concurrent.atomic.AtomicReference<String>();
        doAnswer(call->{attempted.set(call.getArgument(0));call.callRealMethod();throw new IllegalStateException("Injected storage failure after write");})
            .when(storage).put(anyString(),any(byte[].class),anyString());
        byte[] png=image("png",9);
        try {
            upload(id,photo,png,"operator","OPERARIO",500);
            verify(storage).delete(attempted.get());
            assertThat(org.assertj.core.api.Assertions.catchThrowable(()->storage.read(attempted.get()))).isInstanceOf(StoredFileNotFoundException.class);
            assertThat(jdbc.queryForObject("select uploaded_at is null from intervention_evidences where id=?",Boolean.class,photo)).isTrue();
            assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(3);
        } finally {doCallRealMethod().when(storage).put(anyString(),any(byte[].class),anyString());}
        upload(id,photo,png,"operator","OPERARIO",200);
    }
    @Test void simultaneousFileRetriesStoreOnlyOnce() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();long photo=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        byte[] png=image("png",11);var gate=new CountDownLatch(1);clearInvocations(storage);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<JsonNode> action=()->{gate.await();return upload(id,photo,png,"operator","OPERARIO",200);};
            var a=pool.submit(action);var b=pool.submit(action);gate.countDown();assertThat(a.get(15,TimeUnit.SECONDS)).isEqualTo(b.get(15,TimeUnit.SECONDS));
        }
        verify(storage,times(1)).put(anyString(),any(byte[].class),eq("image/png"));
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='EVIDENCE_UPLOADED'",Integer.class,id)).isEqualTo(1);
    }
    @Test void invalidAnnouncementCannotCreatePendingRows() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);
        mvc.perform(post("/api/v1/interventions/"+id+"/evidences").with(user("operator@test.local").authorities(()->"OPERARIO"))
            .contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("momentCode","INVALID");announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",422);
        body.put("momentCode","BEFORE");body.put("capturedLocation",Map.of("latitude",91,"longitude",-77));announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",400);
        body.remove("capturedLocation");body.put("caption","x".repeat(256));announce(id,body,UUID.randomUUID().toString(),"operator","OPERARIO",400);
        assertThat(jdbc.queryForObject("select count(*) from intervention_evidences where intervention_id=?",Integer.class,id)).isZero();
    }
    JsonNode receivedPhoto(JsonNode detail, int index, String name, String role) throws Exception {
        long id=detail.get("id").asLong();
        var body=evidenceBody(detail,index,detail.get("version").asLong());body.put("momentCode","UNSPECIFIED");
        long photo=announce(id,body,UUID.randomUUID().toString(),name,role,201).get("id").asLong();
        upload(id,photo,image("png",12),name,role,200);
        return json.readTree(mvc.perform(get("/api/v1/interventions/"+id)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data");
    }
    JsonNode completeLocation(JsonNode d,int index,String name,String role,int expected) throws Exception {
        return localCommand(d.get("id").asLong(),d.get("locations").get(index).get("id").asLong(),"complete",name,role,
                Map.of("version",d.get("version").asLong(),"executedQuantity",2,"executionNotes","Work reported complete"),expected);
    }
    @Test void mandatoryPhotoBelongsToLocationAndCurrentAttemptAndMustBeReceived() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        completeLocation(d,0,"operator","OPERARIO",422);
        long photo=announce(id,evidenceBody(d,0,2),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        localCommand(id,a,"complete","operator","OPERARIO",Map.of("version",3,"executedQuantity",2,"executionNotes","Report"),422);
        upload(id,photo,image("png",2),"operator","OPERARIO",200);
        var result=localCommand(id,a,"complete","operator","OPERARIO",Map.of("version",4,"executedQuantity",2,"executionNotes","Report"),200);
        assertThat(result.get("locations").get(0).get("statusCode").asString()).isEqualTo("COMPLETED");
        assertThat(result.get("statusCode").asString()).isEqualTo("IN_PROGRESS");
        assertThat(result.get("approvedForCounting").asBoolean()).isFalse();
        long b=d.get("locations").get(1).get("id").asLong();
        var next=localCommand(id,b,"start","operator","OPERARIO",Map.of("version",5),200);
        completeLocation(next,1,"operator","OPERARIO",422);
    }
    @Test void onlyCoordinatorApprovesAndActivityCountsOnceAfterAllLocationsApproved() throws Exception {
        var d=assignedPlan(true);long id=d.get("id").asLong();
        for(int index=0;index<3;index++) {
            long location=d.get("locations").get(index).get("id").asLong();
            d=localCommand(id,location,"start","operator","OPERARIO",Map.of("version",d.get("version").asLong()),200);
            d=receivedPhoto(d,index,"operator","OPERARIO");
            d=completeLocation(d,index,"supervisor","SUPERVISOR",200);
            assertThat(d.get("approvedForCounting").asBoolean()).isFalse();
            for(var role:Map.of("planner","ADMIN","supervisor","SUPERVISOR","operator","OPERARIO").entrySet()) {
                localCommand(id,location,"validate",role.getKey(),role.getValue(),Map.of("version",d.get("version").asLong()),403);
            }
            d=localCommand(id,location,"validate","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong()),200);
            assertThat(d.get("approvedForCounting").asBoolean()).isEqualTo(index==2);
        }
        assertThat(d.get("statusCode").asString()).isEqualTo("VALIDATED");
        assertThat(d.get("validatedAt").isNull()).isFalse();
        assertThat(d.get("locationCount").asInt()).isEqualTo(3);
        mvc.perform(get("/api/v1/interventions?statusCode=VALIDATED")).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page.totalElements").value(1)).andExpect(jsonPath("$.data.content[0].approvedForCounting").value(true));
        localCommand(id,d.get("locations").get(0).get("id").asLong(),"observe","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong(),"reason","Already approved"),422);
    }
    @Test void approvalBlocksPendingPhotosAndRetriesDoNotRewriteApproval() throws Exception {
        var d=receivedPhoto(startedPlan(),0,"operator","OPERARIO");long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        long pending=announce(id,evidenceBody(d,0,d.get("version").asLong()),UUID.randomUUID().toString(),"operator","OPERARIO",201).get("id").asLong();
        d=localCommand(id,a,"complete","operator","OPERARIO",Map.of("version",d.get("version").asLong()+1,"executedQuantity",2,"executionNotes","Report"),200);
        localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong()),422);
        var received=upload(id,pending,image("png",3),"operator","OPERARIO",200);
        d=localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",received.get("interventionVersion").asLong()),200);
        localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong()-1),409);
        localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong()),422);
        assertThat(jdbc.queryForObject("select count(*) from intervention_events where intervention_id=? and action_code='VALIDATED'",Integer.class,id)).isEqualTo(1);
    }
    @Test void observationAndCapatazCorrectionPreserveHistoryAndRequireNewEvidence() throws Exception {
        var d=completeLocation(receivedPhoto(startedPlan(),0,"operator","OPERARIO"),0,"operator","OPERARIO",200);
        long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong();
        localCommand(id,a,"observe","supervisor","SUPERVISOR",Map.of("version",d.get("version").asLong(),"reason","Review"),403);
        localCommand(id,a,"observe","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong(),"reason"," "),400);
        d=localCommand(id,a,"observe","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong(),"reason","Correct garden A"),200);
        assertThat(d.get("statusCode").asString()).isEqualTo("OBSERVED");
        localCommand(id,a,"reopen","operator","OPERARIO",Map.of("version",d.get("version").asLong()),403);
        localCommand(id,a,"reopen","other-supervisor","SUPERVISOR",Map.of("version",d.get("version").asLong()),404);
        d=localCommand(id,a,"reopen","supervisor","SUPERVISOR",Map.of("version",d.get("version").asLong()),200);
        assertThat(d.get("locations").get(0).get("attemptNumber").asInt()).isEqualTo(2);
        assertThat(d.get("locations").get(0).get("executedByUserId").asLong()).isEqualTo(operator);
        assertThat(d.get("locations").get(0).get("completedAt").isNull()).isTrue();
        assertThat(jdbc.queryForObject("select details->'previous'->>'executionNotes' from intervention_events where intervention_id=? and action_code='REOPENED'",String.class,id)).isEqualTo("Work reported complete");
        completeLocation(d,0,"supervisor","SUPERVISOR",422);
        d=receivedPhoto(d,0,"supervisor","SUPERVISOR");
        d=completeLocation(d,0,"supervisor","SUPERVISOR",200);
        localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",d.get("version").asLong()),200);
        assertThat(jdbc.queryForObject("select count(*) from intervention_evidences where intervention_id=?",Integer.class,id)).isEqualTo(2);
    }
    @Test void coordinatorCannotApproveWorkTheyReportedBeforeRoleChange() throws Exception {
        var d=completeLocation(receivedPhoto(startedPlan(),0,"operator","OPERARIO"),0,"supervisor","SUPERVISOR",200);
        jdbc.update("update users set role_item_id=(select i.id from catalog_items i join catalog_types t on t.id=i.catalog_type_id where t.code='ROLE' and i.code='COORDINADOR') where id=?",supervisor);
        localCommand(d.get("id").asLong(),d.get("locations").get(0).get("id").asLong(),"validate","supervisor","COORDINADOR",Map.of("version",d.get("version").asLong()),403);
    }
    @Test void completionNeedsLocalUnitQuantityAndReportWithoutChangingOtherLocations() throws Exception {
        var d=receivedPhoto(startedPlan(),0,"operator","OPERARIO");long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong(),version=d.get("version").asLong();
        localCommand(id,a,"complete","operator","OPERARIO",Map.of("version",version,"executionNotes","No quantity"),422);
        localCommand(id,a,"complete","operator","OPERARIO",Map.of("version",version,"executionNotes","Report","executedQuantity",-1),400);
        localCommand(id,a,"complete","other-supervisor","SUPERVISOR",Map.of("version",version,"executionNotes","Report","executedQuantity",2),404);
        var foreign=assignedPlan(true);
        localCommand(id,foreign.get("locations").get(0).get("id").asLong(),"validate","coordinator","COORDINADOR",Map.of("version",version),404);
        d=completeLocation(d,0,"operator","OPERARIO",200);
        assertThat(d.get("locations").get(1).get("statusCode").asString()).isEqualTo("ASSIGNED");
    }
    @Test void competingApprovalAndObservationCannotBothWin() throws Exception {
        var d=completeLocation(receivedPhoto(startedPlan(),0,"operator","OPERARIO"),0,"operator","OPERARIO",200);
        long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong(),version=d.get("version").asLong();var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var results=new ArrayList<Future<Integer>>();
            for(String action:List.of("validate","observe"))results.add(pool.submit(()->{gate.await();return mvc.perform(post("/api/v1/interventions/"+id+"/locations/"+a+"/"+action)
                .with(user("coordinator@test.local").authorities(()->"COORDINADOR")).contentType("application/json")
                .content(json.writeValueAsString(Map.of("version",version,"reason","Correct it")))).andReturn().getResponse().getStatus();}));
            gate.countDown();assertThat(List.of(results.get(0).get(15,TimeUnit.SECONDS),results.get(1).get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(version+1);
    }
    @Test void failedApprovalEventRollsBackStateAndVersion() throws Exception {
        var d=completeLocation(receivedPhoto(startedPlan(),0,"operator","OPERARIO"),0,"operator","OPERARIO",200);
        long id=d.get("id").asLong(),a=d.get("locations").get(0).get("id").asLong(),version=d.get("version").asLong();
        jdbc.execute("create function test_reject_approval() returns trigger language plpgsql as $$ begin if new.action_code='VALIDATED' then raise exception 'Injected approval failure'; end if; return new; end; $$");
        jdbc.execute("create trigger test_reject_approval before insert on intervention_events for each row execute function test_reject_approval()");
        try {
            localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",version),500);
            assertThat(jdbc.queryForObject("select validated_at is null and validated_by_user_id is null from intervention_locations where id=?",Boolean.class,a)).isTrue();
            assertThat(jdbc.queryForObject("select version from interventions where id=?",Long.class,id)).isEqualTo(version);
        } finally {jdbc.execute("drop trigger test_reject_approval on intervention_events");jdbc.execute("drop function test_reject_approval()");}
        localCommand(id,a,"validate","coordinator","COORDINADOR",Map.of("version",version),200);
    }

    @Test void busyAnnouncementKeyReturnsConflictWithoutCreatingPhoto() throws Exception {
        var d=startedPlan();long id=d.get("id").asLong();var body=evidenceBody(d,0,2);String key=UUID.randomUUID().toString();
        try(var connection=jdbc.getDataSource().getConnection()){
            connection.setAutoCommit(false);
            try(var statement=connection.prepareStatement("select pg_advisory_xact_lock(hashtextextended(?,0))")){
                statement.setString(1,"interventions:evidence-submit:"+operator+":"+key);statement.execute();
                announce(id,body,key,"operator","OPERARIO",409);
            } finally {connection.rollback();}
        }
        announce(id,body,key,"operator","OPERARIO",201);
    }
}
