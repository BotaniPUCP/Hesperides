package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

import java.util.Locale;

/** Filtros de la lista: el alcance de §3.1 primero, luego búsqueda por código o texto. */
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

    public Specification<Incident> matching(String search, String status, Boolean active) {
        Specification<Incident> spec = (root, query, cb) -> cb.conjunction();
        if (status != null && !status.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status").get("code"), status));
        }
        if (active != null) {
            spec = spec.and((root, query, cb) -> active
                    ? cb.isNotNull(root.get("activatedAt")) : cb.isNull(root.get("activatedAt")));
        }
        if (search != null && !search.isBlank()) spec = spec.and(text(search.trim()));
        return spec;
    }

    private static Specification<Incident> text(String search) {
        String pattern = LikePattern.contains(search.toLowerCase(Locale.ROOT));
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("code")), pattern, '\\'),
                cb.like(cb.lower(cb.coalesce(root.get("title"), "")), pattern, '\\'),
                cb.like(cb.lower(root.get("description")), pattern, '\\'),
                cb.like(cb.lower(cb.coalesce(root.get("locationReference"), "")), pattern, '\\'));
    }
}
