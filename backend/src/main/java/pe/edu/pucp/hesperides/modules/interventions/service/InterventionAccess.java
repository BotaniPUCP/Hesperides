package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionReferencesRepository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import java.util.Objects;

/** Shared resource scope, including when a different module displays linked work. */
@Component @RequiredArgsConstructor
public class InterventionAccess {
    private final InterventionReferencesRepository references;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    public boolean canRead(User user,Long id,Long team,Long assignee) {
        var global=jdbc.queryForList("SELECT x.responsible_supervisor_user_id,x.legacy_baseline_pending,s.code FROM activity_executions x JOIN catalog_items s ON s.id=x.status_item_id WHERE x.intervention_id=? AND x.deleted_at IS NULL",id);
        if(global.isEmpty())return canRead(user,team,assignee);
        var row=global.get(0);
        if(java.util.Set.of("ADMIN","COORDINADOR").contains(user.getRoleCode()))return true;
        return user.getRoleCode().equals("SUPERVISOR") &&
            (Objects.equals(user.getId(),row.get("responsible_supervisor_user_id")) ||
             (row.get("responsible_supervisor_user_id")==null && (row.get("code").equals("PLANNED")||(Boolean.TRUE.equals(row.get("legacy_baseline_pending"))&&!row.get("code").equals("CANCELLED")))));
    }
    public void requireRead(User user,Long id,Long team,Long assignee) {
        if(!canRead(user,id,team,assignee))throw new ResourceNotFoundException("Intervention not found");
    }
    public boolean canRead(User user, Long team, Long assignee) {
        return switch (user.getRoleCode()) {
            case "ADMIN", "COORDINADOR" -> true;
            case "SUPERVISOR" -> references.supervises(user.getId(), team);
            case "OPERARIO" -> Objects.equals(user.getId(), assignee);
            default -> false;
        };
    }
    public void requireRead(User user, Long team, Long assignee) {
        if (!canRead(user, team, assignee)) throw new ResourceNotFoundException("Intervention not found");
    }
}
