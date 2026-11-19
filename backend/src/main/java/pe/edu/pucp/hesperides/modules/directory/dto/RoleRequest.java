package pe.edu.pucp.hesperides.modules.directory.dto;

/**
 * Cambia solo el rol del contacto en una organización (SPEC-106 §4.3): un rol o
 * {@code null} para quitárselo. Nunca toca el vínculo ni los datos del contacto.
 */
public record RoleRequest(String role) {
}
