package pe.edu.pucp.hesperides.modules.interventions.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

/** Parameterized reads of existing masters; never changes their geometries or membership. */
@Repository
@RequiredArgsConstructor
public class InterventionReferencesRepository {
    private final JdbcTemplate jdbc;
    public record Item(Long id, String code, Long parentId, boolean active) {}
    public Optional<Item> item(Long id, String type) {
        if (id == null) return Optional.empty();
        return jdbc.query("""
            select i.id,i.code,i.parent_item_id,(i.is_active and i.deleted_at is null and t.deleted_at is null) active
            from catalog_items i join catalog_types t on t.id=i.catalog_type_id where i.id=? and t.code=?
            """,(r,n)->new Item(r.getLong("id"),r.getString("code"),r.getObject("parent_item_id",Long.class),r.getBoolean("active")),id,type).stream().findFirst();
    }
    public Long codeId(String type,String code) {
        return jdbc.query("""
            select i.id from catalog_items i join catalog_types t on t.id=i.catalog_type_id
            where t.code=? and i.code=? and i.is_active and i.deleted_at is null and t.deleted_at is null
            """,(r,n)->r.getLong(1),type,code).stream().findFirst().orElse(null);
    }
    public String code(Long id) { return jdbc.queryForObject("select code from catalog_items where id=?",String.class,id); }
    public boolean hasActiveChildren(Long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists(select 1 from catalog_items i join catalog_types t on t.id=i.catalog_type_id
              where i.parent_item_id=? and i.is_active and i.deleted_at is null
                and t.code='INTERVENTION_TYPE' and t.deleted_at is null)
            """,Boolean.class,id));
    }
    public Optional<String> spatialName(String kind,Long id,boolean allowInactive) {
        if(id==null)return Optional.empty();
        String sql=switch(kind) {
            case "zone" -> "select name from zones where id=?"+(allowInactive?"":" and is_active and deleted_at is null");
            case "place" -> "select name from places where id=?"+(allowInactive?"":" and deleted_at is null");
            case "element" -> "select coalesce(name,code) from green_elements where id=?"+(allowInactive?"":" and is_active and deleted_at is null");
            default -> throw new IllegalArgumentException("Unknown spatial master");
        };
        return jdbc.query(sql,(r,n)->r.getString(1),id).stream().findFirst();
    }
    public String nextCode() { return jdbc.queryForObject("select next_intervention_code()",String.class); }
    public boolean lockSubmission(Long actor,UUID key) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select pg_try_advisory_xact_lock(hashtextextended(?,0))",Boolean.class,"interventions:create:"+actor+":"+key));
    }
    public boolean lockEvidenceSubmission(Long actor, UUID key, UUID reference) {
        boolean byKey=Boolean.TRUE.equals(jdbc.queryForObject("select pg_try_advisory_xact_lock(hashtextextended(?,0))",
                Boolean.class,"interventions:evidence-submit:"+actor+":"+key));
        return byKey && Boolean.TRUE.equals(jdbc.queryForObject("select pg_try_advisory_xact_lock(hashtextextended(?,0))",
                Boolean.class,"interventions:evidence-reference:"+reference));
    }
    public List<Map<String,Object>> teams(Long supervisor) {
        return supervisor==null?jdbc.queryForList("select id,name,supervisor_user_id from teams where is_active and deleted_at is null order by name,id")
            :jdbc.queryForList("select id,name,supervisor_user_id from teams where is_active and deleted_at is null and supervisor_user_id=? order by name,id",supervisor);
    }
    public List<Map<String,Object>> catalogOptions() {
        return jdbc.queryForList("""
            select i.id,i.code,i.label,i.parent_item_id as "parentItemId",t.code as "typeCode"
            from catalog_items i join catalog_types t on t.id=i.catalog_type_id
            where i.is_active and i.deleted_at is null and t.deleted_at is null
              and t.code in ('INTERVENTION_CLASS','INTERVENTION_TYPE','INTERVENTION_STATUS','MEASUREMENT_UNIT','EVIDENCE_MOMENT')
            order by t.code,i.sort_order,i.id
            """);
    }
    public List<Map<String,Object>> placeOptions() {
        return jdbc.queryForList("select id,name from places where deleted_at is null order by name,id");
    }
    public List<Map<String,Object>> zoneOptions() {
        return jdbc.queryForList("select id,name from zones where is_active and deleted_at is null order by name,id");
    }
    public Long responsibleSupervisor(Long team) {
        if (team == null) return null;
        return jdbc.query("""
            select u.id from teams t join users u on u.id=t.supervisor_user_id
            join catalog_items r on r.id=u.role_item_id
            where t.id=? and t.is_active and t.deleted_at is null and u.is_active and u.deleted_at is null
              and r.code='SUPERVISOR' and r.is_active and r.deleted_at is null
            """,(r,n)->r.getLong(1),team).stream().findFirst().orElse(null);
    }
    public boolean supervises(Long user,Long team) {
        if(team==null)return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from teams where id=? and supervisor_user_id=? and is_active and deleted_at is null)",Boolean.class,team,user));
    }
    public List<Map<String,Object>> candidates(Long team) {
        return jdbc.queryForList("""
            select u.id,u.first_name || ' ' || u.last_name as "fullName" from users u
            join catalog_items r on r.id=u.role_item_id join teams t on t.id=?
            where t.is_active and t.deleted_at is null and u.is_active and u.deleted_at is null
            and r.is_active and r.deleted_at is null and r.code in ('SUPERVISOR','OPERARIO')
            and (t.supervisor_user_id=u.id or exists(select 1 from team_members m where m.team_id=t.id
                and m.user_id=u.id and m.left_at is null and m.deleted_at is null)) order by u.last_name,u.first_name,u.id
            """,team);
    }
}
