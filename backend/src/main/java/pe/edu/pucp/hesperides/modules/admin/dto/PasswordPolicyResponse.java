package pe.edu.pucp.hesperides.modules.admin.dto;

/**
 * La política de contraseña tal como la consumen las pantallas que la enseñan
 * en vivo.
 *
 * <p>Viajan las dos longitudes, aunque solo el mínimo sea configurable. El
 * máximo es el límite de BCrypt —más allá trunca en silencio— y antes vivía
 * duplicado en una constante del frontend: dos fuentes para la misma regla, que
 * es como el checklist acabó anunciando un tope sin que nadie comprobara que
 * seguía coincidiendo con el servidor. Si el servidor lo dice, no hay nada que
 * sincronizar a mano.
 *
 * @param minLength configurable vía {@code PASSWORD_MIN_LENGTH}
 * @param maxLength límite técnico de BCrypt, no editable
 */
public record PasswordPolicyResponse(int minLength, int maxLength) {
}