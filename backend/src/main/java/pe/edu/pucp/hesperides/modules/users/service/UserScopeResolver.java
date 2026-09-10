package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.RoleCodes;

import java.util.ArrayList;
import java.util.List;

/**
 * Resuelve a quién puede ver quien consulta, según el Anexo A de SPEC-001:
 * ADMIN y COORDINADOR ven a todos; SUPERVISOR solo a su cuadrilla; cualquier
 * otro, solo a sí mismo.
 *
 * El alcance se calcula contra teams/team_members en cada petición, no contra un
 * claim del JWT: así reasignar a alguien de cuadrilla cambia su alcance en el
 * siguiente request, sin esperar a que expire su token.
 */
@Component
@RequiredArgsConstructor
public class UserScopeResolver {

    private final UsersRepository usersRepository;
    private final TeamMembersRepository teamMembersRepository;

    /**
     * @param seesEveryone   true para ADMIN y COORDINADOR
     * @param visibleUserIds ids visibles cuando no ve a todos. Vacío jamás
     *                       significa "todos": significa que no ve a nadie
     */
    public record Scope(boolean seesEveryone, List<Long> visibleUserIds) {
    }

    @Transactional(readOnly = true)
    public Scope resolve(String viewerEmail) {
        User viewer = usersRepository.findActiveByEmail(viewerEmail)
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));

        String roleCode = viewer.getRoleCode();

        if (RoleCodes.ADMIN.equals(roleCode) || RoleCodes.COORDINADOR.equals(roleCode)) {
            return new Scope(true, List.of());
        }

        if (RoleCodes.SUPERVISOR.equals(roleCode)) {
            return new Scope(false, membersOfTeamsLedBy(viewer));
        }

        // OPERARIO y cualquier rol futuro sin permiso de listado: su propia ficha.
        return new Scope(false, List.of(viewer.getId()));
    }

    private List<Long> membersOfTeamsLedBy(User supervisor) {
        List<Long> teamIds = teamMembersRepository.findActiveTeamsOfUser(supervisor.getId())
                .stream().map(Team::getId).toList();

        // Se incluye siempre a sí mismo: un supervisor debe poder ver su propia
        // ficha aunque no figure como miembro de la cuadrilla que dirige.
        List<Long> visible = new ArrayList<>();
        visible.add(supervisor.getId());

        if (!teamIds.isEmpty()) {
            visible.addAll(teamMembersRepository.findActiveUserIdsOfTeams(teamIds));
        }

        return visible.stream().distinct().toList();
    }
}
