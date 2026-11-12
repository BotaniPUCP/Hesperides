package pe.edu.pucp.hesperides.modules.reports;

import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rows for the reports tests, written with plain SQL so a test states exactly
 * the state it needs: approval, civil date and section are the subject of the
 * reports, not a side effect of the intervention workflow.
 *
 * <p>Timestamps of intervention locations are UTC wall-clock values, as the
 * module stores them.
 */
final class ReportFixtures {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    record Account(long id, String email, String role) {
    }

    private final JdbcTemplate jdbc;

    ReportFixtures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static String unique(String prefix) {
        return prefix + "-" + (System.currentTimeMillis() % 100_000) + "-" + SEQUENCE.incrementAndGet();
    }

    long item(String type, String code) {
        return jdbc.queryForObject("""
            select ci.id from catalog_items ci join catalog_types ct on ct.id=ci.catalog_type_id
            where ct.code=? and ci.code=? and ci.deleted_at is null
            """, Long.class, type, code);
    }

    Account account(String role) {
        String email = unique(role.toLowerCase()) + "@reports.test";
        long id = jdbc.queryForObject("""
            insert into users(email,password_hash,first_name,last_name,role_item_id)
            values (?, 'test', 'Test', ?, ?) returning id
            """, Long.class, email, role, item("ROLE", role));
        return new Account(id, email, role);
    }

    long team(long supervisorId, Long sectorId) {
        String code = unique("RT");
        return jdbc.queryForObject("insert into teams(code,name,supervisor_user_id,zone_id) values (?,?,?,?) returning id",
                Long.class, code, "Cuadrilla " + code, supervisorId, sectorId);
    }

    long sector() {
        return zone("SECTOR", null, null);
    }

    long section(Long sectorId, String areaM2) {
        return zone("SECTION", sectorId, areaM2 == null ? null : new BigDecimal(areaM2));
    }

    long subsection(long sectionId) {
        return zone("SUBSECTION", sectionId, new BigDecimal("10"));
    }

    private long zone(String type, Long parentId, BigDecimal area) {
        String code = unique("RZ");
        return jdbc.queryForObject("""
            insert into zones(code,name,parent_zone_id,zone_type_item_id,area_m2) values (?,?,?,?,?) returning id
            """, Long.class, code, "Zona " + code, parentId, item("ZONE_TYPE", type), area);
    }

    long place(Long zoneId) {
        return jdbc.queryForObject("""
            insert into places(name,kind_item_id,category_item_id,zone_id)
            values (?, (select ci.id from catalog_items ci join catalog_types ct on ct.id=ci.catalog_type_id
                        where ct.code='PLACE_KIND' order by ci.id limit 1),
                       (select ci.id from catalog_items ci join catalog_types ct on ct.id=ci.catalog_type_id
                        where ct.code='REFERENCE_CATEGORY' order by ci.id limit 1), ?) returning id
            """, Long.class, unique("Lugar"), zoneId);
    }

    /** An active intervention type whose class is active too. */
    long anyType() {
        return jdbc.queryForObject("""
            select t.id from catalog_items t join catalog_items c on c.id=t.parent_item_id
            join catalog_types tt on tt.id=t.catalog_type_id and tt.code='INTERVENTION_TYPE'
            where t.is_active and t.deleted_at is null and c.is_active and c.deleted_at is null
            order by t.id limit 1
            """, Long.class);
    }

    long classOf(long typeId) {
        return jdbc.queryForObject("select parent_item_id from catalog_items where id=?", Long.class, typeId);
    }

    /** A work assigned to a team: planning ASSIGNED unless stated otherwise. */
    long work(long typeId, long teamId, Account assignee, Account planner, String planning) {
        return jdbc.queryForObject("""
            insert into interventions(intervention_class_item_id,intervention_type_item_id,planning_status_item_id,
                team_id,assigned_to_user_id,assigned_by_user_id,created_by_user_id,scheduled_date,
                origin_item_id,reported_by_item_id)
            values (?,?,?,?,?,?,?,date '2026-10-01',?,?) returning id
            """, Long.class, classOf(typeId), typeId, item("INTERVENTION_STATUS", planning), teamId,
                assignee.id(), planner.id(), planner.id(),
                item("INTERVENTION_ORIGIN", "MAINTENANCE"), item("INCIDENT_SOURCE", "NONE"));
    }

    /**
     * A location of a work. {@code completedUtc} null means not executed;
     * {@code validated} adds the approval one hour after the execution.
     */
    long location(long workId, Long zoneId, Long placeId, String status, String completedUtc,
                  boolean validated, Account executor, Account validator) {
        return jdbc.queryForObject("""
            insert into intervention_locations(intervention_id,client_reference,zone_id,place_id,status_item_id,
                started_at,completed_at,validated_at,executed_by_user_id,validated_by_user_id,location)
            values (?, gen_random_uuid(), ?, ?, ?,
                ?::timestamp - interval '1 hour', ?::timestamp,
                case when ? then ?::timestamp + interval '1 hour' end,
                case when ?::timestamp is not null then ? end, case when ? then ? end,
                ST_SetSRID(ST_MakePoint(-77.08, -12.07), 4326)) returning id
            """, Long.class, workId, zoneId, placeId, item("INTERVENTION_STATUS", status),
                completedUtc, completedUtc, validated, completedUtc,
                completedUtc, executor.id(), validated, validator.id());
    }

    /**
     * An incident registered at {@code createdAt} (ISO-8601 with offset) whose
     * history starts with {@code initialStatus}. The current status is set by
     * {@link #changeStatus}.
     */
    long incident(Account reporter, Long teamId, String initialStatus, String createdAt, Double lat, Double lon) {
        long id = jdbc.queryForObject("""
            insert into incidents(original_description,description,latitude,longitude,status_item_id,
                reported_by_user_id,team_id,client_reference,request_hash,created_at,updated_at)
            values (?,?,?,?,?,?,?,gen_random_uuid(),'test',?::timestamptz,?::timestamptz) returning id
            """, Long.class, "Incidencia de prueba", "Incidencia de prueba", lat, lon,
                item("INCIDENT_STATUS", initialStatus), reporter.id(), teamId, createdAt, createdAt);
        history(id, initialStatus, createdAt, reporter);
        return id;
    }

    void changeStatus(long incidentId, String status, String at, Account by) {
        jdbc.update("update incidents set status_item_id=?, resolved_at=case when ?='RESOLVED' then ?::timestamptz end where id=?",
                item("INCIDENT_STATUS", status), status, at, incidentId);
        history(incidentId, status, at, by);
    }

    private void history(long incidentId, String status, String at, Account by) {
        jdbc.update("""
            insert into incident_status_history(incident_id,status_item_id,changed_by_user_id,created_at,updated_at)
            values (?,?,?,?::timestamptz,?::timestamptz)
            """, incidentId, item("INCIDENT_STATUS", status), by.id(), at, at);
    }

    /** One approved work with a single location in {@code zoneId}, executed at {@code completedUtc}. */
    long approvedWork(long typeId, long teamId, Account operator, Account coordinator, Long zoneId, String completedUtc) {
        long work = work(typeId, teamId, operator, coordinator, "ASSIGNED");
        location(work, zoneId, null, "VALIDATED", completedUtc, true, operator, coordinator);
        return work;
    }
}
