package pe.edu.pucp.hesperides.modules.interventions;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.util.*;
import java.time.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers @SpringBootTest @AutoConfigureMockMvc
class ActivitiesIntegrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    @DynamicPropertySource static void db(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired pe.edu.pucp.hesperides.modules.interventions.service.InterventionExecutionHistoryProvider executionHistory;
    long coord,worker,other;
    String role(String name) {return switch(name){case "coord"->"COORDINADOR";case "admin"->"ADMIN";case "operator"->"OPERARIO";default->"SUPERVISOR";};}
    @BeforeEach void setup() {
        jdbc.update("UPDATE interventions SET deleted_at=CURRENT_TIMESTAMP WHERE created_by_user_id IN (SELECT id FROM users WHERE email LIKE '%@activity.test')");
        jdbc.update("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE email LIKE '%@activity.test' AND deleted_at IS NULL");
        for(String name:List.of("coord","worker","other","admin","operator")) {
            long id=jdbc.queryForObject("INSERT INTO users(email,password_hash,first_name,last_name,role_item_id) SELECT ?,'test',?, 'Activity',i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='ROLE' AND i.code=? RETURNING id",Long.class,name+"@activity.test",name,role(name));
            if(name.equals("coord"))coord=id;if(name.equals("worker"))worker=id;if(name.equals("other"))other=id;
        }
    }
    JsonNode call(String method,String path,Object body,String name,int expected) throws Exception {
        var request=switch(method){case "POST"->post(path);case "PUT"->put(path);default->get(path);};
        var result=mvc.perform(request.with(user(name+"@activity.test").authorities(()->role(name)))
            .contentType("application/json").content(body==null?"":json.writeValueAsString(body)))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return result.isEmpty()?null:json.readTree(result).get("data");
    }
    Map<String,Object> plan(Long responsible,boolean future) throws Exception {
        var inventory=call("GET","/api/v1/interventions/campus-selection",null,"coord",200);
        long type=jdbc.queryForObject("SELECT i.id FROM catalog_items i JOIN catalog_items p ON p.id=i.parent_item_id JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_TYPE' AND p.code='HABILITACION' ORDER BY i.id LIMIT 1",Long.class);
        long clazz=jdbc.queryForObject("SELECT parent_item_id FROM catalog_items WHERE id=?",Long.class,type);
        var p=new LinkedHashMap<String,Object>();p.put("classItemId",clazz);p.put("typeItemId",type);
        p.put("scheduledDate",LocalDate.now(ZoneId.of("America/Lima")).plusDays(future?1:0).toString());
        p.put("description","Global activity");p.put("campusSelectionRevision",inventory.get("selectionRevision").asString());
        p.put("locations",List.of(Map.of("clientReference",UUID.randomUUID(),"zoneId",inventory.get("zones").get(0).get("id").asLong(),"zoneSelectionRevision",inventory.get("selectionRevision").asString())));
        var body=new LinkedHashMap<String,Object>();body.put("planning",p);body.put("responsibleSupervisorUserId",responsible);return body;
    }
    JsonNode create(Map<String,Object> body,String key,int expected) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/activities").with(user("coord@activity.test").authorities(()->"COORDINADOR"))
            .header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).get("data");
    }
    JsonNode create(Long responsible) throws Exception {return create(plan(responsible,false),UUID.randomUUID().toString(),201);}
    Map<String,Object> progress(JsonNode d,int percent,String target,UUID ref) {
        var t=new LinkedHashMap<String,Object>();t.put("locationId",d.get("targets").get(0).get("id").asLong());t.put("statusCode",target);
        if(target.equals("PARTIAL"))t.put("partialDescription","Garden edge pending");
        var p=new LinkedHashMap<String,Object>();p.put("version",d.get("version").asLong());p.put("clientReference",ref);p.put("percentage",percent);p.put("description","Global progress");p.put("targets",List.of(t));return p;
    }
    JsonNode save(JsonNode d,Map<String,Object> p,String name,int expected) throws Exception {return call("POST","/api/v1/activities/"+d.get("id").asLong()+"/progress",p,name,expected);}
    JsonNode read(long id,String name) throws Exception {return call("GET","/api/v1/activities/"+id,null,name,200);}
    long photo(JsonNode d,String name) throws Exception {
        var b=Map.of("version",d.get("version").asLong(),"clientReference",UUID.randomUUID(),"locationId",d.get("targets").get(0).get("id").asLong(),"momentCode","UNSPECIFIED","caption","Activity evidence");
        long eid=call("POST","/api/v1/activities/"+d.get("id").asLong()+"/evidences",b,name,200).get("id").asLong();
        var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
        mvc.perform(multipart("/api/v1/activities/"+d.get("id").asLong()+"/evidences/"+eid+"/file")
            .file(new MockMultipartFile("file","photo.png","image/png",out.toByteArray())).with(r->{r.setMethod("PUT");return r;})
            .with(user(name+"@activity.test").authorities(()->role(name)))).andExpect(status().isOk());return eid;
    }
    JsonNode executed() throws Exception {
        var d=create(worker);long eid=photo(d,"worker");d=read(d.get("id").asLong(),"worker");
        var p=progress(d,100,"COMPLETED",UUID.randomUUID());p.put("evidenceIds",List.of(eid));return save(d,p,"worker",200);
    }

    @Test void firstSavedProgressClaimsResponsibilityWithoutTeamAndOpeningDoesNotStart() throws Exception {
        var d=create(null);long id=d.get("id").asLong();
        assertThat(read(id,"worker").get("startedAt").isNull()).isTrue();
        d=save(d,progress(d,25,"PARTIAL",UUID.randomUUID()),"worker",200);
        assertThat(d.get("statusCode").asString()).isEqualTo("IN_PROGRESS");assertThat(d.get("responsibleSupervisorUserId").asLong()).isEqualTo(worker);
        assertThat(d.get("history").get(0).get("actorUserId").asLong()).isEqualTo(worker);
        var shared=call("GET","/api/v1/interventions/"+id,null,"worker",200);
        assertThat(shared.get("activityWorkflow").asBoolean()).isTrue();
        assertThat(shared.get("progressPercentage").asInt()).isEqualTo(25);
        assertThat(jdbc.queryForObject("SELECT team_id IS NULL AND assigned_to_user_id IS NULL FROM interventions WHERE id=?",Boolean.class,id)).isTrue();
        call("GET","/api/v1/activities/"+id,null,"other",404);
        call("POST","/api/v1/interventions/"+id+"/locations/"+d.get("targets").get(0).get("id").asLong()+"/start",Map.of("version",d.get("version").asLong()),"worker",409);
    }
    @Test void supervisorMapUsesScopedTargetsInsteadOfTheCoordinatorPlanningRoute() throws Exception {
        var d=create(worker);long id=d.get("id").asLong();
        var map=call("GET","/api/v1/activities/"+id+"/map-options",null,"worker",200);
        assertThat(map.get("zones").size()).isEqualTo(1);assertThat(map.get("specimens").size()).isZero();
        assertThat(map.get("zones").get(0).get("id").asLong()).isEqualTo(d.get("targets").get(0).get("zoneId").asLong());
        call("GET","/api/v1/activities/"+id+"/map-options",null,"other",404);
        call("GET","/api/v1/interventions/campus-selection",null,"worker",403);
    }
    @Test void importedWorkRecordsItsOwnPercentageAndKeepsOriginalStartAndHistory() throws Exception {
        var request=plan(null,false);var body=request.get("planning");
        var legacy=json.readTree(mvc.perform(post("/api/v1/interventions").with(user("coord@activity.test").authorities(()->"COORDINADOR"))
            .header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("data");
        long id=legacy.get("id").asLong();
        jdbc.update("UPDATE intervention_locations SET status_item_id=(SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_STATUS' AND i.code='IN_PROGRESS'),started_at=TIMESTAMP '2026-11-01 12:00:00',executed_by_user_id=?,execution_notes='Previous local report' WHERE intervention_id=?",worker,id);
        jdbc.update("INSERT INTO activity_executions(intervention_id,version,status_item_id,responsible_supervisor_user_id,started_at,legacy_imported,legacy_baseline_pending,legacy_snapshot) SELECT id,version,(SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='ACTIVITY_STATUS' AND i.code='IN_PROGRESS'),?,TIMESTAMP '2026-11-01 12:00:00',TRUE,TRUE,jsonb_build_object('locations',(SELECT jsonb_agg(to_jsonb(l)) FROM intervention_locations l WHERE l.intervention_id=interventions.id)) FROM interventions WHERE id=?",worker,id);
        var d=read(id,"worker");assertThat(d.get("percentage").isNull()).isTrue();assertThat(d.get("previousHistory").size()).isPositive();
        assertThat(d.get("targets").get(0).get("statusCode").asString()).isEqualTo("PARTIAL");
        d=save(d,progress(d,37,"PARTIAL",UUID.randomUUID()),"worker",200);
        assertThat(d.get("percentage").asInt()).isEqualTo(37);assertThat(d.get("legacyBaselinePending").asBoolean()).isFalse();
        assertThat(d.get("startedAt").asString()).isEqualTo("2026-11-01T12:00:00Z");
        assertThat(d.get("history").size()).isEqualTo(1);assertThat(d.get("previousHistory").size()).isPositive();
        assertThat(d.get("previousReports").get(0).get("description").asString()).isEqualTo("Previous local report");
        assertThat(d.get("previousReports").get(0).get("occurredAt").asString()).isEqualTo("2026-11-01T12:00:00Z");
        call("POST","/api/v1/interventions/"+id+"/locations/"+d.get("targets").get(0).get("id").asLong()+"/start",Map.of("version",d.get("version").asLong()),"worker",409);
    }
    @Test void currentStatusFiltersAreAppliedBeforePagingWithoutChangingLegacyCodes() throws Exception {
        var planned=create(worker);var done=executed();
        var filtered=call("GET","/api/v1/interventions?activityStatusCode=EXECUTED&size=1",null,"coord",200);
        assertThat(filtered.get("content").size()).isEqualTo(1);assertThat(filtered.get("content").get(0).get("id").asLong()).isEqualTo(done.get("id").asLong());
        filtered=call("GET","/api/v1/interventions?activityStatusCode=PLANNED&size=1",null,"coord",200);
        assertThat(filtered.get("content").get(0).get("id").asLong()).isEqualTo(planned.get("id").asLong());
        call("GET","/api/v1/interventions?activityStatusCode=OBSERVED",null,"coord",400);
    }
    @Test void creationRetryIncludesResponsibleAndChangedBodyCannotReplay() throws Exception {
        var body=plan(worker,false);var key=UUID.randomUUID().toString();var d=create(body,key,201);
        assertThat(create(body,key,200).get("id")).isEqualTo(d.get("id"));body.put("responsibleSupervisorUserId",other);create(body,key,409);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity_executions WHERE intervention_id=?",Integer.class,d.get("id").asLong())).isEqualTo(1);
    }
    @Test void percentageSnapshotAndDescriptionAreValidatedAtomically() throws Exception {
        var d=create(worker);
        save(d,progress(d,101,"PARTIAL",UUID.randomUUID()),"worker",400);
        save(d,progress(d,50,"COMPLETED",UUID.randomUUID()),"worker",422);
        save(d,progress(d,100,"PARTIAL",UUID.randomUUID()),"worker",422);
        var p=progress(d,25,"PARTIAL",UUID.randomUUID());p.put("targets",List.of());save(d,p,"worker",400);
        p.put("targets",List.of(Map.of("locationId",Long.MAX_VALUE,"statusCode","NOT_STARTED")));save(d,p,"worker",400);
        assertThat(read(d.get("id").asLong(),"worker").get("history").size()).isZero();
    }
    @Test void futureExecutionAndUnauthorizedRolesAreRejected() throws Exception {
        var d=create(plan(worker,true),UUID.randomUUID().toString(),201);
        save(d,progress(d,20,"PARTIAL",UUID.randomUUID()),"worker",422);
        save(d,progress(d,20,"PARTIAL",UUID.randomUUID()),"coord",403);
        save(d,progress(d,20,"PARTIAL",UUID.randomUUID()),"operator",403);
        call("POST","/api/v1/activities/"+d.get("id").asLong()+"/cancel",Map.of("version",0),"worker",403);
        assertThat(read(d.get("id").asLong(),"coord").get("statusCode").asString()).isEqualTo("PLANNED");
    }
    @Test void executedCanBeCorrectedDownAndFinishedOnlyByCoordinator() throws Exception {
        var d=executed();long id=d.get("id").asLong();assertThat(d.get("statusCode").asString()).isEqualTo("EXECUTED");
        call("POST","/api/v1/activities/"+id+"/approve",Map.of("version",d.get("version").asLong()),"worker",403);
        d=save(d,progress(d,40,"PARTIAL",UUID.randomUUID()),"worker",200);
        assertThat(d.get("executedAt").isNull()).isTrue();assertThat(d.get("history").size()).isEqualTo(2);
        call("POST","/api/v1/activities/"+id+"/approve",Map.of("version",d.get("version").asLong()),"coord",422);
        d=save(d,progress(d,100,"COMPLETED",UUID.randomUUID()),"worker",200);
        d=call("POST","/api/v1/activities/"+id+"/approve",Map.of("version",d.get("version").asLong()),"coord",200);
        assertThat(d.get("statusCode").asString()).isEqualTo("FINISHED");assertThat(d.get("finishedAt").isNull()).isFalse();
        save(d,progress(d,10,"PARTIAL",UUID.randomUUID()),"worker",422);
        var compatible=call("GET","/api/v1/interventions/"+id,null,"coord",200);
        assertThat(compatible.get("statusCode").asString()).isEqualTo("VALIDATED");assertThat(compatible.get("approvedForCounting").asBoolean()).isTrue();
    }
    @Test void fullProgressRequiresReceivedPhotoAndPrivateFilesEnforceScope() throws Exception {
        var d=create(worker);save(d,progress(d,100,"COMPLETED",UUID.randomUUID()),"worker",422);
        long id=d.get("id").asLong(),eid=photo(d,"worker");
        call("GET","/api/v1/activities/"+id,null,"other",404);
        mvc.perform(get("/api/v1/activities/"+id+"/evidences/"+eid+"/file").with(user("other@activity.test").authorities(()->"SUPERVISOR"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/activities/"+id+"/evidences/"+eid+"/file").with(user("worker@activity.test").authorities(()->"SUPERVISOR"))).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
    }
    @Test void retryAndVersionConflictsDoNotDuplicateHistory() throws Exception {
        var d=create(worker);var p=progress(d,30,"PARTIAL",UUID.randomUUID());
        d=save(d,p,"worker",200);save(d,p,"worker",200);
        p.put("description","Changed content");save(d,p,"worker",409);
        var stale=progress(d,50,"PARTIAL",UUID.randomUUID());stale.put("version",0);save(d,stale,"worker",409);
        d=save(d,progress(d,10,"PARTIAL",UUID.randomUUID()),"worker",200);
        assertThat(d.get("history").size()).isEqualTo(2);assertThat(d.get("percentage").asInt()).isEqualTo(10);
    }
    @Test void reassignmentRevokesPreviousSupervisorAndPreservesActualAuthor() throws Exception {
        var d=create(worker);d=save(d,progress(d,20,"PARTIAL",UUID.randomUUID()),"worker",200);long id=d.get("id").asLong();
        d=call("PUT","/api/v1/activities/"+id+"/responsible",Map.of("version",d.get("version").asLong(),"responsibleSupervisorUserId",other),"coord",200);
        call("GET","/api/v1/activities/"+id,null,"worker",404);
        d=save(d,progress(d,50,"PARTIAL",UUID.randomUUID()),"other",200);
        assertThat(d.get("history").get(0).get("actorUserId").asLong()).isEqualTo(worker);
        assertThat(d.get("history").get(1).get("actorUserId").asLong()).isEqualTo(other);
    }
    @Test void cancelDuringExecutionHasOptionalReasonAndKeepsProgress() throws Exception {
        var d=create(worker);d=save(d,progress(d,20,"PARTIAL",UUID.randomUUID()),"worker",200);long id=d.get("id").asLong();
        d=call("POST","/api/v1/activities/"+id+"/cancel",Map.of("version",d.get("version").asLong()),"coord",200);
        assertThat(d.get("statusCode").asString()).isEqualTo("CANCELLED");assertThat(d.get("percentage").asInt()).isEqualTo(20);assertThat(d.get("history").size()).isEqualTo(1);
        save(d,progress(d,25,"PARTIAL",UUID.randomUUID()),"worker",422);
    }
    @Test void concurrentFirstProgressHasOnlyOneResponsible() throws Exception {
        var d=create(null);long id=d.get("id").asLong();var gate=new CountDownLatch(1);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var futures=new ArrayList<Future<Integer>>();
            for(String name:List.of("worker","other")) {
                var p=progress(d,20,"PARTIAL",UUID.randomUUID());
                futures.add(pool.submit(()->{gate.await();return mvc.perform(post("/api/v1/activities/"+id+"/progress").with(user(name+"@activity.test").authorities(()->"SUPERVISOR")).contentType("application/json").content(json.writeValueAsString(p))).andReturn().getResponse().getStatus();}));
            }
            gate.countDown();assertThat(List.of(futures.get(0).get(30,TimeUnit.SECONDS),futures.get(1).get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,404);
        } finally {pool.shutdownNow();}
        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity_progress_entries WHERE intervention_id=?",Integer.class,id)).isEqualTo(1);
    }
    @Test void planningEditsKeepGlobalModelAndResponsibleWithoutTeam() throws Exception {
        var body=plan(worker,false);var d=create(body,UUID.randomUUID().toString(),201);long id=d.get("id").asLong();
        @SuppressWarnings("unchecked") var planning=(Map<String,Object>)body.get("planning");
        planning.put("version",d.get("version").asLong());planning.put("description","Edited activity");
        @SuppressWarnings("unchecked") var ls=(List<Map<String,Object>>)planning.get("locations");
        var loc=new LinkedHashMap<String,Object>(ls.get(0));loc.put("id",d.get("targets").get(0).get("id").asLong());planning.put("locations",List.of(loc));
        d=call("PUT","/api/v1/activities/"+id+"/planning",body,"coord",200);
        assertThat(d.get("description").asString()).isEqualTo("Edited activity");assertThat(d.get("responsibleSupervisorUserId").asLong()).isEqualTo(worker);
        assertThat(d.get("statusCode").asString()).isEqualTo("PLANNED");
    }
    @Test void lateAuditFailureRollsBackResponsibilityProgressAndCompatibilityProjection() throws Exception {
        var d=create(null);long id=d.get("id").asLong();
        jdbc.execute("CREATE FUNCTION test_fail_global_progress() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_code='ACTIVITY_PROGRESS_SAVED' THEN RAISE EXCEPTION 'Injected global event failure'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER test_fail_global_progress BEFORE INSERT ON intervention_events FOR EACH ROW EXECUTE FUNCTION test_fail_global_progress()");
        try {save(d,progress(d,20,"PARTIAL",UUID.randomUUID()),"worker",500);}
        finally {jdbc.execute("DROP TRIGGER test_fail_global_progress ON intervention_events");jdbc.execute("DROP FUNCTION test_fail_global_progress()");}
        var after=read(id,"coord");assertThat(after.get("statusCode").asString()).isEqualTo("PLANNED");
        assertThat(after.get("responsibleSupervisorUserId").isNull()).isTrue();assertThat(after.get("history").size()).isZero();
        assertThat(after.get("version").asLong()).isZero();
        assertThat(jdbc.queryForObject("SELECT started_at IS NULL FROM intervention_locations WHERE intervention_id=?",Boolean.class,id)).isTrue();
    }
    @Test void newListsRespectOwnershipAndReferencesCannotBeReusedAcrossActivities() throws Exception {
        var a=create(worker);var b=create(other);var shared=UUID.randomUUID();
        save(a,progress(a,20,"PARTIAL",shared),"worker",200);
        save(b,progress(b,20,"PARTIAL",shared),"other",409);
        var list=call("GET","/api/v1/activities?size=1",null,"worker",200);
        assertThat(list.get("page").get("totalElements").asInt()).isEqualTo(1);
        assertThat(list.get("content").get(0).get("id")).isEqualTo(a.get("id"));
        var compatible=call("GET","/api/v1/interventions?size=1",null,"worker",200);
        assertThat(compatible.get("page").get("totalElements").asInt()).isEqualTo(1);
    }
    @Test void planningCannotBypassCoordinatorOnlyReassignment() throws Exception {
        var body=plan(worker,false);var d=create(body,UUID.randomUUID().toString(),201);long id=d.get("id").asLong();
        @SuppressWarnings("unchecked") var planning=(Map<String,Object>)body.get("planning");
        planning.put("version",d.get("version").asLong());
        body.put("responsibleSupervisorUserId",other);
        call("PUT","/api/v1/activities/"+id+"/planning",body,"admin",403);
        assertThat(read(id,"coord").get("responsibleSupervisorUserId").asLong()).isEqualTo(worker);
    }
    @Test void acceptedGlobalWorkAppearsInResponsibleHistoryWithoutTeam() throws Exception {
        var d=executed();long id=d.get("id").asLong();
        var pending=call("GET","/api/v1/interventions/"+id,null,"coord",200);
        assertThat(pe.edu.pucp.hesperides.engine.incidents.IncidentClosure.blockers(true,List.of(pending.get("statusCode").asString())))
            .containsExactly(pe.edu.pucp.hesperides.engine.incidents.ClosureBlocker.WORK_NOT_VALIDATED);
        d=call("POST","/api/v1/activities/"+id+"/approve",Map.of("version",d.get("version").asLong()),"coord",200);
        long type=d.get("typeItemId").asLong();var today=LocalDate.now(ZoneId.of("America/Lima"));
        var context=org.springframework.security.core.context.SecurityContextHolder.getContext();
        try {
            context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("worker@activity.test","",List.of()));
            assertThat(executionHistory.locationExecutions(type,"IN_HOUSE",today.minusDays(1),today))
                .extracting(pe.edu.pucp.hesperides.modules.maintenance.service.LocationExecution::interventionId).contains(id);
            context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("other@activity.test","",List.of()));
            assertThat(executionHistory.locationExecutions(type,"IN_HOUSE",today.minusDays(1),today)).isEmpty();
        } finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
}
