package pe.edu.pucp.hesperides.modules.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.service.AuthService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieFactory cookieFactory;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {

        ClientType clientType = ClientType.fromHeader(clientTypeHeader);
        AuthService.LoginResult result = authService.login(request, clientType, userAgent);

        return respondWithSession(result, clientType, "Login successful");
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @CookieValue(value = RefreshTokenCookieFactory.COOKIE_NAME, required = false) String cookieToken,
            @RequestBody(required = false) RefreshRequest body,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {

        ClientType clientType = ClientType.fromHeader(clientTypeHeader);
        String rawToken = clientType == ClientType.MOBILE && body != null ? body.refreshToken() : cookieToken;
        AuthService.LoginResult result = authService.refresh(rawToken, clientType, userAgent);

        return respondWithSession(result, clientType, "Token refreshed successfully");
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(value = RefreshTokenCookieFactory.COOKIE_NAME, required = false) String cookieToken,
            @RequestBody(required = false) RefreshRequest body) {

        authService.logout(body != null && body.refreshToken() != null ? body.refreshToken() : cookieToken);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.expire().toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@AuthenticationPrincipal UserDetails principal) {
        UserResponse user = authService.currentUser(principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Current user retrieved successfully", user));
    }

    /**
     * Web recibe el refresh token en cookie httpOnly y nunca en el cuerpo;
     * móvil al revés, porque una app nativa no tiene almacén de cookies del
     * navegador y guarda el token en SecureStore.
     */
    private ResponseEntity<ApiResponse<LoginResponse>> respondWithSession(
            AuthService.LoginResult result, ClientType clientType, String message) {

        if (clientType == ClientType.MOBILE) {
            LoginResponse payload = new LoginResponse(
                    result.accessToken(), result.refreshToken(), result.expiresIn(), result.user());
            return ResponseEntity.ok(ApiResponse.ok(message, payload));
        }

        LoginResponse payload = new LoginResponse(
                result.accessToken(), null, result.expiresIn(), result.user());
        ResponseCookie cookie = cookieFactory.create(result.refreshToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok(message, payload));
    }

    public record RefreshRequest(String refreshToken) {
    }
}
