package pe.edu.pucp.hesperides.modules.auth.dto;

import java.time.Instant;

/**
 * Nótese que no existe ningún campo para el hash de la contraseña. No es un
 * descuido: es la garantía de que no puede salir por esta vía ni siquiera por
 * accidente (SPEC-001 §9.1).
 */
public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        RoleResponse role,
        boolean isActive,
        Instant lastLogin) {
}
