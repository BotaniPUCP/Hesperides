package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers @TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ActivityContinuationMigrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    JdbcTemplate db;long actor,reviewer;Map<String,Long> work=new LinkedHashMap<>();String before;
    long item(String type,String code){return db.queryForObject("SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code=? AND i.code=?",Long.class,type,code);}
    @BeforeAll void migrate(){
        var source=new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword());db=new JdbcTemplate(source);
        Flyway.configure().dataSource(source).target("72").load().migrate();actor=db.queryForObject("SELECT min(id) FROM users",Long.class);reviewer=db.queryForObject("INSERT INTO users(email,password_hash,first_name,last_name,role_item_id) SELECT 'migration-reviewer@test.local','test','Review','Test',role_item_id FROM users WHERE id=? RETURNING id",Long.class,actor);
        for(String state:List.of("PLANNED","ASSIGNED","IN_PROGRESS","OBSERVED","COMPLETED","VALIDATED","CANCELLED")){
            long id=db.queryForObject("INSERT INTO interventions(intervention_class_item_id,planning_status_item_id,created_by_user_id,scheduled_date,origin_item_id,reported_by_item_id) SELECT (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_CLASS' ORDER BY i.id LIMIT 1),?,?,CURRENT_DATE,?,? RETURNING id",Long.class,item("INTERVENTION_STATUS",state.equals("CANCELLED")?"CANCELLED":state.equals("PLANNED")?"PLANNED":"ASSIGNED"),actor,item("INTERVENTION_ORIGIN","MAINTENANCE"),item("INCIDENT_SOURCE","NONE"));
            work.put(state,id);
            db.update("INSERT INTO intervention_locations(intervention_id,client_reference,status_item_id,started_at,completed_at,validated_at,attempt_number,execution_notes,executed_by_user_id,validated_by_user_id) VALUES (?,gen_random_uuid(),?,CASE WHEN ? THEN TIMESTAMP '2026-11-01 12:00:00' END,CASE WHEN ? THEN TIMESTAMP '2026-11-02 12:00:00' END,CASE WHEN ? THEN TIMESTAMP '2026-11-03 12:00:00' END,2,'Original report',CASE WHEN ? THEN ? END,CASE WHEN ? THEN ? END)",id,item("INTERVENTION_STATUS",state),Set.of("IN_PROGRESS","OBSERVED","COMPLETED","VALIDATED").contains(state),Set.of("COMPLETED","VALIDATED").contains(state),state.equals("VALIDATED"),Set.of("IN_PROGRESS","OBSERVED","COMPLETED","VALIDATED").contains(state),actor,state.equals("VALIDATED"),reviewer);
            db.update("INSERT INTO intervention_events(intervention_id,action_code,actor_user_id,to_status_item_id,details) VALUES (?,'CREATED',?,?, '{}'::jsonb)",id,actor,item("INTERVENTION_STATUS",state));
            db.update("INSERT INTO intervention_evidences(intervention_id,intervention_location_id,attempt_number,client_reference,moment_item_id,uploaded_by_user_id) SELECT ?,id,2,gen_random_uuid(),?,? FROM intervention_locations WHERE intervention_id=?",id,item("EVIDENCE_MOMENT","UNSPECIFIED"),actor,id);
        }
        long retired=db.queryForObject("INSERT INTO intervention_locations(intervention_id,client_reference,status_item_id,attempt_number) VALUES (?,gen_random_uuid(),?,2) RETURNING id",Long.class,work.get("PLANNED"),item("INTERVENTION_STATUS","PLANNED"));
        db.update("INSERT INTO intervention_evidences(intervention_id,intervention_location_id,attempt_number,client_reference,moment_item_id,uploaded_by_user_id) VALUES (?,?,2,gen_random_uuid(),?,?)",work.get("PLANNED"),retired,item("EVIDENCE_MOMENT","UNSPECIFIED"),actor);
        db.update("UPDATE intervention_locations SET deleted_at=CURRENT_TIMESTAMP WHERE id=?",retired);
        before=snapshot();Flyway.configure().dataSource(source).load().migrate();
    }
    String snapshot(){return db.queryForObject("SELECT jsonb_build_object('work',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM interventions i),'locations',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM intervention_locations l),'events',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM intervention_events e),'photos',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM intervention_evidences e))::text",String.class);}
    @Test void preservesAllOriginalDataAndDoesNotInventPercentagesOrProgress(){
        assertThat(snapshot()).isEqualTo(before);
        for(String state:List.of("PLANNED","ASSIGNED","IN_PROGRESS","OBSERVED","COMPLETED")){
            var row=db.queryForMap("SELECT x.*,s.code FROM activity_executions x JOIN catalog_items s ON s.id=x.status_item_id WHERE intervention_id=?",work.get(state));
            assertThat(row.get("progress_percentage")).isNull();assertThat(row.get("legacy_baseline_pending")).isEqualTo(true);
            assertThat(row.get("code")).isEqualTo(switch(state){case "PLANNED","ASSIGNED"->"PLANNED";case "COMPLETED"->"EXECUTED";default->"IN_PROGRESS";});
        }
        assertThat(db.queryForObject("SELECT count(*) FROM activity_progress_entries",Integer.class)).isZero();
    }
    @Test void closedRecordsRemainClosedAndPhotosKeepTheirAuthorAndOriginalReference(){
        for(String state:List.of("VALIDATED","CANCELLED"))assertThat(db.queryForObject("SELECT count(*) FROM activity_executions WHERE intervention_id=?",Integer.class,work.get(state))).isZero();
        assertThat(db.queryForObject("SELECT count(*) FROM activity_evidences a JOIN intervention_evidences e ON e.id=a.legacy_evidence_id WHERE a.uploaded_by_user_id=e.uploaded_by_user_id AND a.legacy_counts_for_completion",Integer.class)).isEqualTo(5);
        assertThat(db.queryForObject("SELECT count(*) FROM activity_evidences WHERE legacy_evidence_id IS NOT NULL",Integer.class)).isEqualTo(6);
    }
    @Test void keepsKnownStartDatesWithoutPretendingThatAResponsibleWasAssigned(){
        var row=db.queryForMap("SELECT started_at,responsible_supervisor_user_id FROM activity_executions WHERE intervention_id=?",work.get("IN_PROGRESS"));
        assertThat(row.get("started_at").toString()).startsWith("2026-11-01 12:00:00");assertThat(row.get("responsible_supervisor_user_id")).isNull();
        assertThat(db.queryForObject("SELECT (legacy_snapshot->'locations'->0->>'attempt_number')::int FROM activity_executions WHERE intervention_id=?",Integer.class,work.get("IN_PROGRESS"))).isEqualTo(2);
        assertThatThrownBy(()->db.update("UPDATE activity_executions SET legacy_snapshot='{}'::jsonb WHERE intervention_id=?",work.get("IN_PROGRESS"))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
