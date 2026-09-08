package pe.edu.pucp.hesperides.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Rechaza con 403 cualquier endpoint bajo /api/v1/** para un usuario que aún
 * no ha cambiado su contraseña temporal (SPEC-100 §5.2).
 *
 * La lista blanca es cerrada y deliberadamente corta: lo que la pantalla de
 * cambio de contraseña necesita ya viene en GET /api/v1/auth/me, y el refresh
 * y el logout deben seguir funcionando. La restricción vive aquí, en el
 * backend, y no solo en el frontend: un curl con la contraseña temporal no
 * opera el sistema.
 *
 * La bandera se lee de la base en cada request, igual que CustomUserDetailsService:
 * así, el cambio de contraseña surte efecto en el siguiente request sin esperar
 * a que expire el access token.
 */
@Component
@RequiredArgsConstructor
public class MustChangePasswordFilter extends OncePerRequestFilter {

    public static final String MESSAGE = "Password change required before using the system";

    private final ObjectMapper objectMapper;
    private final UsersRepository usersRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!path.startsWith("/api/v1/") || isWhitelisted(request)
                || !currentUserHasPendingPasswordChange(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getOutputStream().write(objectMapper.writeValueAsBytes(ApiResponse.error(MESSAGE)));
    }

    private boolean isWhitelisted(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        return ("POST".equals(method) && "/api/v1/users/me/password".equals(path))
                || ("GET".equals(method) && "/api/v1/auth/me".equals(path))
                || ("POST".equals(method) && "/api/v1/auth/refresh".equals(path))
                || ("POST".equals(method) && "/api/v1/auth/logout".equals(path));
    }

    /**
     * Sin autenticación, el filtro no decide nada: los entry points de Spring
     * Security responden 401 o 403 según corresponda. Solo se evalúa la bandera
     * cuando hay un principal cargado por el JwtAuthenticationFilter.
     */
    private boolean currentUserHasPendingPasswordChange(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            return false;
        }
        return usersRepository.findActiveByEmail(userDetails.getUsername())
                .map(User::isMustChangePassword)
                .orElse(false);
    }
}