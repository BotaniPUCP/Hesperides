package pe.edu.pucp.hesperides.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * refreshToken se omite del JSON cuando es null, que es el caso de web: allí
 * viaja en una cookie httpOnly y no debe ser legible por JavaScript.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserResponse user) {
}
