package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.exception.TooManyAttemptsException;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UsersRepository usersRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private LoginAttemptService loginAttemptService;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(usersRepository, passwordEncoder, tokenProvider,
                refreshTokenService, loginAttemptService);
    }

    private User activeUser() {
        CatalogItem role = new CatalogItem();
        role.setCode("COORDINADOR");
        role.setLabel("Coordinador");

        User user = new User();
        user.setEmail("ana@pucp.edu.pe");
        user.setPasswordHash("$2a$10$hash");
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setRoleItem(role);
        user.setActive(true);
        return user;
    }

    @Test
    void successfulLoginReturnsTokensAndTheUser() {
        User user = activeUser();
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secreta123", "$2a$10$hash")).thenReturn(true);
        when(tokenProvider.generateAccessToken("ana@pucp.edu.pe", "COORDINADOR")).thenReturn("access-token");
        when(tokenProvider.getAccessTokenValiditySeconds()).thenReturn(1800L);
        when(refreshTokenService.issue(any(), any(), any())).thenReturn("refresh-token");

        var result = service.login(new LoginRequest("ana@pucp.edu.pe", "secreta123"),
                ClientType.WEB, "Mozilla/5.0");

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        assertThat(result.expiresIn()).isEqualTo(1800L);
        assertThat(result.user().email()).isEqualTo("ana@pucp.edu.pe");
        assertThat(result.user().role().code()).isEqualTo("COORDINADOR");
    }

    @Test
    void successfulLoginStampsLastLoginAndClearsTheAttemptCounter() {
        User user = activeUser();
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(tokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("t");
        lenient().when(tokenProvider.getAccessTokenValiditySeconds()).thenReturn(1800L);
        when(refreshTokenService.issue(any(), any(), any())).thenReturn("r");

        service.login(new LoginRequest("ana@pucp.edu.pe", "secreta123"), ClientType.WEB, null);

        assertThat(user.getLastLogin()).isNotNull();
        verify(loginAttemptService).reset("ana@pucp.edu.pe");
        verify(usersRepository).save(user);
    }

    @Test
    void aWrongPasswordFailsAndCountsAsAnAttempt() {
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.of(activeUser()));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> service.login(
                new LoginRequest("ana@pucp.edu.pe", "equivocada"), ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid credentials");

        verify(loginAttemptService).recordFailure("ana@pucp.edu.pe");
    }

    @Test
    void anUnknownEmailFailsWithTheSameMessageAsAWrongPassword() {
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());

        // Mismo mensaje a propósito: distinguirlos le diría a un atacante qué
        // correos existen en el sistema.
        assertThatThrownBy(() -> service.login(
                new LoginRequest("nadie@pucp.edu.pe", "loquesea"), ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void aDeactivatedUserCannotLogInAndGetsTheSameGenericMessage() {
        User inactive = activeUser();
        inactive.setActive(false);
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> service.login(
                new LoginRequest("ana@pucp.edu.pe", "secreta123"), ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void aBlockedEmailIsRejectedBeforeCheckingThePassword() {
        when(loginAttemptService.isBlocked("ana@pucp.edu.pe")).thenReturn(true);

        assertThatThrownBy(() -> service.login(
                new LoginRequest("ana@pucp.edu.pe", "secreta123"), ClientType.WEB, null))
                .isInstanceOf(TooManyAttemptsException.class);

        verify(usersRepository, never()).findActiveByEmail(anyString());
    }

    @Test
    void logoutRevokesTheRefreshToken() {
        service.logout("refresh-token");

        verify(refreshTokenService).revokeByRawToken("refresh-token");
    }

    @Test
    void currentUserReturnsTheProfileWithoutAnyPasswordField() {
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(activeUser()));

        var response = service.currentUser("ana@pucp.edu.pe");

        assertThat(response.email()).isEqualTo("ana@pucp.edu.pe");
        assertThat(response.fullName()).isEqualTo("Ana Torres");
        assertThat(response.toString()).doesNotContain("$2a$10$hash");
    }
}
