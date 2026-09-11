package pe.edu.pucp.hesperides.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Set;

/**
 * Impide operar el sistema con una contraseña temporal sin cambiarla.
 *
 * Sin esto, must_change_password sería una sugerencia: cualquiera con la clave
 * que viajó por correo y curl usaría la API entera, y la bandera no protegería
 * nada (SPEC-100 §5.2).
 *
 * Es un filtro y no un interceptor de MVC a propósito: corre antes de que Spring
 * resuelva el handler, así que cubre también las rutas que acabarían en 404 y no
 * deja huecos.
 */
@Component
@RequiredArgsConstructor
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final String API_PREFIX = "/api/v1/";

    /**
     * Lista cerrada. Cada excepción es una vía por la que alguien opera con una
     * credencial que dos personas conocen, así que añadir una exige justificarla.
     * Ni la propia ficha entra: lo que la pantalla de cambio necesita saber del
     * usuario ya viene en /auth/me.
     */
    private static final Set<String> ALLOWED = Set.of(
            "POST /api/v1/users/me/password",
            "GET /api/v1/auth/me",
            "POST /api/v1/auth/refresh",
            "POST /api/v1/auth/logout");

    private final UsersRepository usersRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (shouldBlock(request)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(),
                    ApiResponse.error("Password change required before using the system"));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldBlock(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (!uri.startsWith(API_PREFIX)) {
            return false;
        }
        if (ALLOWED.contains(request.getMethod() + " " + uri)) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            // Sin sesión no hay nada que comprobar: la cadena de seguridad
            // responderá 401 si la ruta lo exige.
            return false;
        }

        return usersRepository.findActiveByEmail(authentication.getName())
                .map(User::isMustChangePassword)
                .orElse(false);
    }
}
