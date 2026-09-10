package pe.edu.pucp.hesperides.modules.users.dto;

import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;

import java.time.Instant;
import java.util.List;

/**
 * Ficha completa de un usuario. Como UserResponse de SPEC-001, no existe ningún
 * campo para el hash de la contraseña: es la garantía de que no puede salir por
 * esta vía ni por accidente.
 *
 * Reutiliza RoleResponse de modules/auth en vez de declarar otro igual: el rol
 * tiene la misma forma en toda la API.
 */
public record UserDetailResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        RoleResponse role,
        boolean isActive,
        CredentialStatus credentialStatus,
        boolean mustChangePassword,
        Instant lastLogin,
        List<TeamSummaryResponse> teams,
        Instant createdAt,
        Instant updatedAt) {
}
