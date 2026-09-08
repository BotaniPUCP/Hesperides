package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.teams.entity.TeamMember;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.modules.users.dto.TeamResponse;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Monta la ficha de un usuario para la respuesta. Vive aquí y no en
 * AuthService porque el listado de SPEC-100 lo necesita en masa; el login y
 * /auth/me lo reutilizan para que la representación sea idéntica en todos los
 * endpoints (misma garantía de "nunca el passwordHash").
 */
@Component
@RequiredArgsConstructor
public class UserResponseMapper {

    private final TeamMembersRepository teamMembersRepository;

    public UserResponse toResponse(User user) {
        return map(user, currentTeams(user.getId()));
    }

    /**
     * Listado sin N+1: una sola consulta trae las pertenencias vigentes de
     * todos los usuarios de la página y se agrupan aquí.
     */
    public List<UserResponse> toResponses(List<User> users) {
        Map<Long, List<TeamResponse>> teamsByUser = teamMembersRepository
                .findByUserIdInAndLeftAtIsNull(users.stream().map(User::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        member -> member.getUser().getId(),
                        Collectors.mapping(this::toTeam, Collectors.toList())));
        return users.stream()
                .map(user -> map(user, teamsByUser.getOrDefault(user.getId(), List.of())))
                .toList();
    }

    private List<TeamResponse> currentTeams(Long userId) {
        return teamMembersRepository.findByUserIdAndLeftAtIsNull(userId)
                .stream()
                .map(this::toTeam)
                .toList();
    }

    private TeamResponse toTeam(TeamMember member) {
        return new TeamResponse(member.getTeam().getId(), member.getTeam().getName());
    }

    private UserResponse map(User user, List<TeamResponse> teams) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getFullName(),
                new RoleResponse(user.getRoleItem().getId(), user.getRoleItem().getCode(),
                        user.getRoleItem().getLabel()),
                user.isActive(),
                user.getCredentialStatus(),
                user.isMustChangePassword(),
                user.getLastLogin(),
                teams,
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}