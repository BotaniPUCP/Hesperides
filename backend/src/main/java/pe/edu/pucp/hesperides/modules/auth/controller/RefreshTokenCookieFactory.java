package pe.edu.pucp.hesperides.modules.auth.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * La cookie del refresh token: httpOnly para que JavaScript no pueda leerla
 * (ni siquiera un XSS), SameSite=Strict como defensa CSRF, y Path acotado a
 * las rutas que realmente la necesitan.
 */
@Component
public class RefreshTokenCookieFactory {

    public static final String COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final boolean secure;
    private final long validityDays;

    public RefreshTokenCookieFactory(
            @Value("${hesperides.security.cookie.secure:true}") boolean secure,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long validityDays) {
        this.secure = secure;
        this.validityDays = validityDays;
    }

    public ResponseCookie create(String rawToken) {
        return baseCookie(rawToken).maxAge(Duration.ofDays(validityDays)).build();
    }

    /** Cookie de borrado: mismo nombre y path, maxAge 0. */
    public ResponseCookie expire() {
        return baseCookie("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(COOKIE_PATH);
    }
}
