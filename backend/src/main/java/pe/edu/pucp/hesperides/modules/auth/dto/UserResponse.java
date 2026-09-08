package pe.edu.pucp.hesperides.modules.auth.dto;

import pe.edu.pucp.hesperides.modules.auth.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.users.dto.TeamResponse;

import java.time.Instant;
import java.util.List;

/**
 * Ficha de un usuario. Nótese que no existe ningún campo para el hash de la
 * contraseña: es la garantía de que no puede salir por esta vía ni siquiera
 * por accidente (SPEC-001 §9.1). SPEC-100 §3.2 le suma el estado de entrega
 * de credenciales, must_change_password y las cuadrillas vigentes.
 */
public record UserResponse(
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
        List<TeamResponse> teams,
        Instant createdAt,
        Instant updatedAt) {
}