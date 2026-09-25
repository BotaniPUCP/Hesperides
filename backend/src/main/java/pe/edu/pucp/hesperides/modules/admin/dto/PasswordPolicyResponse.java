package pe.edu.pucp.hesperides.modules.admin.dto;

/**
 * La política de contraseña tal como la consumen las pantallas que la enseñan
 * en vivo. Hoy solo expone la longitud mínima porque es la única pieza que el
 * administrador configura ({@code PASSWORD_MIN_LENGTH}); el resto son límites
 * técnicos (BCrypt) que no se editan y por eso no viajan.
 */
public record PasswordPolicyResponse(int minLength) {
}