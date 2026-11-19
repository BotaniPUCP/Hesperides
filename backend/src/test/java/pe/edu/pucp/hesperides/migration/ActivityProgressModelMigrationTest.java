package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

/** V071 -> V072 in a disposable database. Never connects to the persistent campus DB. */
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ActivityProgressModelMigrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    JdbcTemplate jdbc;
    TransactionTemplate tx;
    long actor,legacy;
    String before;

    @BeforeAll void migrate() {
        var source=new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword());
        jdbc=new JdbcTemplate(source);tx=new TransactionTemplate(new DataSourceTransactionManager(source));
        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("71").load().migrate();
        actor=jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1",Long.class);
        legacy=work();
        jdbc.update("UPDATE intervention_locations SET unit_item_id=?,requested_quantity=9.125,progress_quantity=3.500,attempt_number=2,rejection_reason='Legacy observation',execution_notes='Original notes' WHERE intervention_id=?",item("MEASUREMENT_UNIT","M2"),legacy);
        jdbc.update("INSERT INTO intervention_events(intervention_id,action_code,actor_user_id,to_status_item_id,details) VALUES (?,'CREATED',?,?, '{}'::jsonb)",legacy,actor,item("INTERVENTION_STATUS","PLANNED"));
        jdbc.update("INSERT INTO intervention_evidences(intervention_id,intervention_location_id,attempt_number,client_reference,moment_item_id,uploaded_by_user_id) SELECT ?,id,2,gen_random_uuid(),?,? FROM intervention_locations WHERE intervention_id=?",legacy,item("EVIDENCE_MOMENT","UNSPECIFIED"),actor,legacy);
        before=legacySnapshot();
        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("72").load().migrate();
    }

    long item(String type,String code) {
        return jdbc.queryForObject("SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code=? AND i.code=?",Long.class,type,code);
    }
    long work() {
        long id=jdbc.queryForObject("""
            INSERT INTO interventions(intervention_class_item_id,planning_status_item_id,created_by_user_id,scheduled_date,origin_item_id,reported_by_item_id)
            SELECT (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_CLASS' ORDER BY i.id LIMIT 1),
            ?,?,CURRENT_DATE,?,? RETURNING id
            """,Long.class,item("INTERVENTION_STATUS","PLANNED"),actor,item("INTERVENTION_ORIGIN","MAINTENANCE"),item("INCIDENT_SOURCE","NONE"));
        for(int n=0;n<2;n++)jdbc.update("INSERT INTO intervention_locations(intervention_id,client_reference,status_item_id) VALUES (?,gen_random_uuid(),?)",id,item("INTERVENTION_STATUS","PLANNED"));
        return id;
    }
    long activity() {
        long id=work();
        jdbc.update("INSERT INTO activity_executions(intervention_id,status_item_id) VALUES (?,?)",id,item("ACTIVITY_STATUS","PLANNED"));
        return id;
    }
    String legacySnapshot() {
        return jdbc.queryForObject("""
            SELECT jsonb_build_object('work',(SELECT to_jsonb(i) FROM interventions i WHERE id=?),
             'locations',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM intervention_locations l WHERE intervention_id=?),
             'events',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM intervention_events e WHERE intervention_id=?),
             'photos',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM intervention_evidences e WHERE intervention_id=?))::text
            """,String.class,legacy,legacy,legacy,legacy);
    }
    long entry(long id,int percent) {
        return jdbc.queryForObject("INSERT INTO activity_progress_entries(intervention_id,client_reference,request_sha256,actor_user_id,progress_percentage,description) VALUES (?,?,repeat('a',64),?,?,'Progress notes') RETURNING id",Long.class,id,UUID.randomUUID(),actor,percent);
    }
    void targets(long id,long entry,String status,String description) {
        jdbc.update("INSERT INTO activity_progress_targets(progress_entry_id,intervention_id,intervention_location_id,status_item_id,partial_description) SELECT ?,?,id,?,? FROM intervention_locations WHERE intervention_id=?",entry,id,item("ACTIVITY_TARGET_STATUS",status),description,id);
    }

    @Test void legacyHistoryAndCatalogsRemainUntouched() {
        assertThat(legacySnapshot()).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity_executions WHERE intervention_id=?",Integer.class,legacy)).isZero();
        assertThat(jdbc.queryForObject("SELECT label FROM catalog_items WHERE id=?",String.class,item("INTERVENTION_STATUS","VALIDATED"))).isEqualTo("Validada");
        assertThat(jdbc.queryForObject("SELECT team_id IS NULL FROM interventions WHERE id=?",Boolean.class,legacy)).isTrue();
    }
    @Test void responsibleIsOptionalWithoutTeamAndNoPercentageIsInvented() {
        long id=activity();
        assertThat(jdbc.queryForObject("SELECT responsible_supervisor_user_id IS NULL AND progress_percentage IS NULL AND started_at IS NULL FROM activity_executions WHERE intervention_id=?",Boolean.class,id)).isTrue();
        jdbc.update("UPDATE activity_executions SET responsible_supervisor_user_id=? WHERE intervention_id=?",actor,id);
        assertThat(jdbc.queryForObject("SELECT team_id IS NULL AND assigned_to_user_id IS NULL FROM interventions WHERE id=?",Boolean.class,id)).isTrue();
        assertThatThrownBy(()->jdbc.update("UPDATE activity_executions SET status_item_id=? WHERE intervention_id=?",item("INTERVENTION_STATUS","PLANNED"),id)).isInstanceOf(DataIntegrityViolationException.class);
    }
    @Test void snapshotsAllowCorrectionsWithoutRewritingEarlierProgress() {
        long id=activity();
        long first=tx.execute(s->{long e=entry(id,100);targets(id,e,"COMPLETED",null);return e;});
        long second=tx.execute(s->{long e=entry(id,40);targets(id,e,"PARTIAL","Edge still pending");return e;});
        assertThat(jdbc.queryForList("SELECT progress_percentage::int FROM activity_progress_entries WHERE intervention_id=? ORDER BY id",Integer.class,id)).containsExactly(100,40);
        assertThatThrownBy(()->jdbc.update("UPDATE activity_progress_entries SET description='Rewrite' WHERE id=?",first)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(()->jdbc.update("DELETE FROM activity_progress_targets WHERE progress_entry_id=?",second)).isInstanceOf(DataIntegrityViolationException.class);
    }
    @Test void incompleteOrInconsistentSnapshotsRollBackTheWholeTransaction() {
        long id=activity();
        assertThatThrownBy(()->tx.execute(s->{entry(id,50);return null;})).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->tx.execute(s->{long e=entry(id,100);targets(id,e,"PARTIAL","Incomplete");return null;})).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->tx.execute(s->{long e=entry(id,50);targets(id,e,"COMPLETED",null);return null;})).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->tx.execute(s->{long e=entry(id,20);targets(id,e,"PARTIAL",null);return null;})).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->tx.execute(s->{entry(id,101);return null;})).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity_progress_entries WHERE intervention_id=?",Integer.class,id)).isZero();
    }
    @Test void targetCannotBelongToAnotherActivity() {
        long id=activity(),other=activity();
        assertThatThrownBy(()->tx.execute(s->{long e=entry(id,20);jdbc.update("INSERT INTO activity_progress_targets(progress_entry_id,intervention_id,intervention_location_id,status_item_id) SELECT ?,?,id,? FROM intervention_locations WHERE intervention_id=?",e,id,item("ACTIVITY_TARGET_STATUS","NOT_STARTED"),other);return null;})).isInstanceOf(RuntimeException.class);
    }
    @Test void evidenceHasNoAttemptAndCannotLinkToAnotherActivitySnapshot() {
        long id=activity(),other=activity();
        long e=tx.execute(s->{long p=entry(id,0);targets(id,p,"NOT_STARTED",null);return p;});
        assertThatThrownBy(()->jdbc.update("INSERT INTO activity_evidences(intervention_id,progress_entry_id,client_reference,moment_item_id,uploaded_by_user_id) VALUES (?,?,gen_random_uuid(),?,?)",other,e,item("EVIDENCE_MOMENT","UNSPECIFIED"),actor)).isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update("INSERT INTO activity_evidences(intervention_id,progress_entry_id,client_reference,moment_item_id,uploaded_by_user_id) VALUES (?,?,gen_random_uuid(),?,?)",id,e,item("EVIDENCE_MOMENT","UNSPECIFIED"),actor);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.columns WHERE table_name='activity_evidences' AND column_name='attempt_number'",Integer.class)).isZero();
    }
    @Test void executionRequiresConsistentDatesAndAllowsOptionalCancellationReason() {
        long id=activity();
        assertThatThrownBy(()->jdbc.update("UPDATE activity_executions SET status_item_id=? WHERE intervention_id=?",item("ACTIVITY_STATUS","EXECUTED"),id)).isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update("UPDATE activity_executions SET responsible_supervisor_user_id=?,status_item_id=?,progress_percentage=25,started_at=CURRENT_TIMESTAMP WHERE intervention_id=?",actor,item("ACTIVITY_STATUS","IN_PROGRESS"),id);
        jdbc.update("UPDATE activity_executions SET status_item_id=?,cancelled_at=CURRENT_TIMESTAMP,cancelled_by_user_id=? WHERE intervention_id=?",item("ACTIVITY_STATUS","CANCELLED"),actor,id);
        assertThat(jdbc.queryForObject("SELECT cancellation_reason IS NULL AND progress_percentage=25 FROM activity_executions WHERE intervention_id=?",Boolean.class,id)).isTrue();
    }
}
