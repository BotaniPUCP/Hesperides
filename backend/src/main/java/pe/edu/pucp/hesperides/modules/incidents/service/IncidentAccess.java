package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.util.List;
import java.util.Set;

/**
 * Quién puede ver y gestionar cada incidencia (SPEC-201 §3.1). El alcance del capataz se calcula
 * con las cuadrillas que dirige hoy, no con el JWT: reasignarlo cambia su alcance de inmediato.
 */
@Component @RequiredArgsConstructor
public class IncidentAccess {
    private static final Set<String> ROLES = Set.of("ADMIN", "COORDINADOR", "SUPERVISOR", "OPERARIO");
    private final UsersRepository users;
    private final TeamsRepository teams;
    private final IncidentsRepository incidents;

    public User actor(String email) {
        return check(users.findActiveByEmail(email).orElseThrow(() -> new UnauthorizedException("Session expired")));
    }

    /** Serializa las capturas de una persona antes de comprobar su clave de reintento. */
    public User lockedActor(String email) {
        return check(users.lockActiveByEmail(email).orElseThrow(() -> new UnauthorizedException("Session expired")));
    }

    private User check(User user) {
        if (!user.isActive() || !user.getRoleItem().isActive() || user.getRoleItem().isDeleted()) {
            throw new UnauthorizedException("Session expired");
        }
        if (!ROLES.contains(user.getRoleCode())) throw new AccessDeniedException("Incident role required");
        return user;
    }

    public boolean manages(User user) {
        return IncidentRoles.manages(user.getRoleCode());
    }

    public void requireManager(User user) {
        if (!manages(user)) throw new AccessDeniedException("Coordinator required");
    }

    public List<Team> ledTeams(User user) {
        return teams.findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNullOrderByNameAsc(user.getId());
    }

    /** Coordinación asigna cualquier cuadrilla activa; el capataz solo ve las suyas. */
    public List<Team> assignableTeams(User user) {
        return manages(user) ? teams.findByActiveTrueAndDeletedAtIsNullOrderByNameAsc() : ledTeams(user);
    }

    public boolean sees(Incident incident, User user) {
        if (manages(user) || incident.getReportedBy().getId().equals(user.getId())) return true;
        Team team = incident.getTeam();
        return "SUPERVISOR".equals(user.getRoleCode()) && team != null && team.isActive() && !team.isDeleted()
                && user.getId().equals(team.getSupervisorUserId());
    }

    /** Lo que no puede ver responde 404, para no revelar que existe. */
    public Incident visible(Long id, User user, boolean lock) {
        Incident incident = (lock ? incidents.lockById(id) : incidents.findByIdAndDeletedAtIsNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        if (!sees(incident, user)) throw new ResourceNotFoundException("Incident not found");
        return incident;
    }

    public Incident managed(Long id, User user) {
        requireManager(user);
        return visible(id, user, true);
    }
}
