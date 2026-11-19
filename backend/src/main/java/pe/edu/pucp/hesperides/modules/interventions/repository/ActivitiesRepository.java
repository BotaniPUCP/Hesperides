package pe.edu.pucp.hesperides.modules.interventions.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import java.util.*;

/** Parameterized persistence. Lock order matches incident closure: parent, then global execution. */
@Repository @RequiredArgsConstructor
public class ActivitiesRepository {
    private final JdbcTemplate jdbc;
    public boolean lockReference(String kind,UUID reference) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(hashtextextended(?,0))",Boolean.class,"activities:"+kind+":"+reference));
    }
    public Map<String,Object> execution(long id,boolean lock) {
        if(lock && jdbc.queryForList("SELECT id FROM interventions WHERE id=? AND deleted_at IS NULL FOR UPDATE",id).isEmpty())
            throw new ResourceNotFoundException("Activity not found");
        var rows=jdbc.queryForList("""
            SELECT x.*,s.code status_code,i.scheduled_date,i.code,i.description
            FROM activity_executions x JOIN interventions i ON i.id=x.intervention_id
            JOIN catalog_items s ON s.id=x.status_item_id
            WHERE x.intervention_id=? AND x.deleted_at IS NULL AND i.deleted_at IS NULL
            """+(lock?" FOR UPDATE OF x":""),id);
        if(rows.isEmpty())throw new ResourceNotFoundException("Activity not found");
        return rows.get(0);
    }
    public List<Map<String,Object>> locations(long id) {
        return jdbc.queryForList("SELECT id FROM intervention_locations WHERE intervention_id=? AND deleted_at IS NULL ORDER BY id",id);
    }
    public List<Map<String,Object>> targets(long id) {
        return jdbc.queryForList("""
            SELECT p.intervention_location_id,s.code status_code,p.partial_description
            FROM activity_progress_targets p JOIN catalog_items s ON s.id=p.status_item_id
            WHERE p.progress_entry_id=(SELECT max(id) FROM activity_progress_entries WHERE intervention_id=?)
            ORDER BY p.intervention_location_id
            """,id);
    }
    public Optional<Map<String,Object>> progress(UUID reference) {
        return jdbc.queryForList("SELECT * FROM activity_progress_entries WHERE client_reference=?",reference).stream().findFirst();
    }
    public List<Map<String,Object>> photos(long id) {
        return jdbc.queryForList("SELECT * FROM activity_evidences WHERE intervention_id=? AND deleted_at IS NULL ORDER BY id",id);
    }
    public Map<String,Object> photo(long id,long photoId) {
        return photos(id).stream().filter(p->((Number)p.get("id")).longValue()==photoId).findFirst()
            .orElseThrow(()->new ResourceNotFoundException("Activity evidence not found"));
    }
    public JdbcTemplate sql() {return jdbc;}
}
