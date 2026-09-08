package pe.edu.pucp.hesperides.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Fija la lista blanca cerrada de SPEC-100 §5.2: un usuario con
 * must_change_password = TRUE solo puede llegar a /users/me/password,
 * /auth/me, /auth/refresh y /auth/logout. Todo lo demás bajo /api/v1/** → 403.
 */
class MustChangePasswordFilterTest {

    private static final String EMAIL = "forzada@pucp.edu.pe";

    private UsersRepository usersRepository;
    private MustChangePasswordFilter filter;
    private MockHttpServletResponse response;
    private jakarta.servlet.FilterChain chain;

    @BeforeEach
    void setUp() {
        usersRepository = mock(UsersRepository.class);
        ObjectMapper objectMapper = mock(ObjectMapper.class);
        when(objectMapper.writeValueAsBytes(any())).thenReturn("{}".getBytes());
        filter = new MustChangePasswordFilter(objectMapper, usersRepository);
        response = new MockHttpServletResponse();
        chain = mock(jakarta.servlet.FilterChain.class);
    }

    private void authenticatedAs(boolean mustChange) {
        UserDetails principal = mock(UserDetails.class);
        when(principal.getUsername()).thenReturn(EMAIL);
        User user = mock(User.class);
        when(user.isMustChangePassword()).thenReturn(mustChange);
        when(usersRepository.findActiveByEmail(EMAIL)).thenReturn(Optional.of(user));
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(principal);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @Test
    void anyEndpointOutsideTheWhitelistIsBlockedWith403AndTheSpecMessage() throws Exception {
        authenticatedAs(true);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users");

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).isEqualTo("{}");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void changeOwnPasswordIsWhitelisted() throws Exception {
        authenticatedAs(true);
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/users/me/password");

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain).doFilter(request, response);
        verify(usersRepository, never()).findActiveByEmail(any());
    }

    @Test
    void authMeRefreshAndLogoutAreWhitelisted() throws Exception {
        authenticatedAs(true);
        filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/auth/me"), response, chain);
        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/auth/refresh"), response, chain);
        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/auth/logout"), response, chain);
        verify(chain, times(3)).doFilter(any(), any());
        verify(usersRepository, never()).findActiveByEmail(any());
    }

    @Test
    void aUserWhoAlreadyChangedPasswordPasses() throws Exception {
        authenticatedAs(false);
        filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/users"), response, chain);
        verify(chain).doFilter(any(), any());
    }

    @Test
    void anonymousRequestsAreLeftToTheEntryPoint() throws Exception {
        SecurityContextHolder.clearContext();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/users"), response, chain);
        verify(chain).doFilter(any(), any());
    }

    @Test
    void pathsOutsideTheApiV1TreeAreNeverEvaluated() throws Exception {
        filter.doFilter(new MockHttpServletRequest("GET", "/actuator/health"), response, chain);
        verify(chain).doFilter(any(), any());
        verify(usersRepository, never()).findActiveByEmail(any());
    }
}