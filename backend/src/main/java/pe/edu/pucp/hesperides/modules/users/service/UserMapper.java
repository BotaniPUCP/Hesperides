package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.users.dto.TeamSummaryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

import java.util.List;

/**
 * Construye el DTO campo por campo, desde una lista explícita. Nunca por
 * reflexión ni con un mapper genérico: así añadir una columna sensible a la
 * entidad no la filtra automáticamente a la API (SPEC-001 §9.1).
 */
@Component
public class UserMapper {

    public UserDetailResponse toResponse(User user, List<Team> teams) {
        return new UserDetailResponse(
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
                teams.stream().map(t -> new TeamSummaryResponse(t.getId(), t.getName())).toList(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
