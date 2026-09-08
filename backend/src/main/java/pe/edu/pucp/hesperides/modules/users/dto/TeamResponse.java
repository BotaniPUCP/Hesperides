package pe.edu.pucp.hesperides.modules.users.dto;

/**
 * Cuadrilla dentro de la ficha de un usuario (SPEC-100 §3.2): solo el par
 * que el listado necesita mostrar, no la entidad completa.
 */
public record TeamResponse(Long id, String name) {
}