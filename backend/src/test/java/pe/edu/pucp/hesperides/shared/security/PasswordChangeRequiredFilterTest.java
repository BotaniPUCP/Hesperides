package pe.edu.pucp.hesperides.shared.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PasswordChangeRequiredFilterTest {

    @Mock private UsersRepository usersRepository;
    @Mock private FilterChain filterChain;

    private PasswordChangeRequiredFilter filter;

    @BeforeEach
    void setUp() {
        filter = new PasswordChangeRequiredFilter(usersRepository, new ObjectMapper());
        SecurityContextHolder.clearContext();
    }

    private void authenticate(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, List.of()));
    }

    private void withUser(String email, boolean mustChange) {
        User user = new User();
        user.setEmail(email);
        user.setMustChangePassword(mustChange);
        when(usersRepository.findActiveByEmail(email)).thenReturn(Optional.of(user));
    }

    private MockHttpServletResponse run(String method, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, filterChain);
        return response;
    }

    @Test
    void blocksABusinessEndpointWhenTheChangeIsPending() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        MockHttpServletResponse response = run("GET", "/api/v1/users");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Password change required");
        // La peticion no llega al controller.
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    void letsThroughTheEndpointThatChangesThePassword() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        MockHttpServletResponse response = run("POST", "/api/v1/users/me/password");

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(any(), any());
    }

    @Test
    void letsThroughAuthMeBecauseTheChangeScreenNeedsIt() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("GET", "/api/v1/auth/me").getStatus()).isEqualTo(200);
    }

    @Test
    void letsThroughRefreshAndLogout() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("POST", "/api/v1/auth/refresh").getStatus()).isEqualTo(200);
        assertThat(run("POST", "/api/v1/auth/logout").getStatus()).isEqualTo(200);
    }

    @Test
    void blocksEvenTheOwnUserDetailEndpoint() throws Exception {
        // La lista de excepciones es cerrada: lo que la pantalla de cambio
        // necesita del usuario ya viene en /auth/me (SPEC-100 §5.2).
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("GET", "/api/v1/users/7").getStatus()).isEqualTo(403);
    }

    @Test
    void doesNotInterfereWhenNoChangeIsPending() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", false);

        assertThat(run("GET", "/api/v1/users").getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(any(), any());
    }

    @Test
    void doesNotInterfereWithAnonymousRequests() throws Exception {
        // Sin autenticacion no hay nada que comprobar: de eso se encarga la
        // cadena de seguridad, que respondera 401 si la ruta lo exige.
        MockHttpServletResponse response = run("POST", "/api/v1/auth/login");

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(any(), any());
    }

    @Test
    void doesNotInterfereOutsideTheApiPrefix() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("GET", "/actuator/health").getStatus()).isEqualTo(200);
    }
}
