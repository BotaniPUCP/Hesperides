package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

/** El alcance de §3.1: qué incidencias ve cada quien. Buscar y filtrar se hace en el navegador (SPEC-119). */
@Component @RequiredArgsConstructor
public class IncidentListFilters {
    private final IncidentAccess access;

    public Specification<Incident> visibleTo(User actor) {
        Specification<Incident> live = (root, query, cb) -> cb.isNull(root.get("deletedAt"));
        if (access.manages(actor)) return live;
        var teamIds = "SUPERVISOR".equals(actor.getRoleCode())
                ? access.ledTeams(actor).stream().map(Team::getId).toList() : java.util.List.<Long>of();
        return live.and((root, query, cb) -> cb.or(
                cb.equal(root.get("reportedBy").get("id"), actor.getId()),
                teamIds.isEmpty() ? cb.disjunction() : root.get("team").get("id").in(teamIds)));
    }
}
