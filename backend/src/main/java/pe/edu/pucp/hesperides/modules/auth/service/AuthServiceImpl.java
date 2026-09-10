package pe.edu.pucp.hesperides.modules.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.TooManyAttemptsException;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;

import java.time.Instant;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    /**
     * Un solo mensaje para credenciales inválidas, correo inexistente y cuenta
     * desactivada: cualquier diferencia le confirmaría a un atacante qué correos
     * existen (SPEC-001 §9).
     */
    private static final String GENERIC_FAILURE = "Invalid credentials";
    private static final String INVALID_TOKEN = "Invalid or expired token";

    private final UsersRepository usersRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final LoginAttemptService loginAttemptService;

    @Override
    @Transactional
    public LoginResult login(LoginRequest request, ClientType clientType, String userAgent) {
        String email = normalize(request.email());

        if (loginAttemptService.isBlocked(email)) {
            throw new TooManyAttemptsException("Too many failed attempts. Try again later");
        }

        User user = usersRepository.findActiveByEmail(email)
                .orElseThrow(() -> failure(email));

        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw failure(email);
        }

        loginAttemptService.reset(email);
        user.setLastLogin(Instant.now());
        usersRepository.save(user);

        return buildResult(user, clientType, userAgent);
    }

    @Override
    @Transactional
    public LoginResult refresh(String rawRefreshToken, ClientType clientType, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException(INVALID_TOKEN);
        }

        RefreshTokenService.RotationResult rotation =
                refreshTokenService.rotate(rawRefreshToken, clientType, userAgent);
        User user = rotation.user();

        if (!user.isActive()) {
            throw new UnauthorizedException(INVALID_TOKEN);
        }

        return new LoginResult(
                tokenProvider.generateAccessToken(user.getEmail(), user.getRoleCode()),
                rotation.rawToken(),
                tokenProvider.getAccessTokenValiditySeconds(),
                toResponse(user));
    }

    @Override
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revokeByRawToken(rawRefreshToken);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse currentUser(String email) {
        return usersRepository.findActiveByEmail(normalize(email))
                .map(this::toResponse)
                .orElseThrow(() -> new UnauthorizedException(INVALID_TOKEN));
    }

    private LoginResult buildResult(User user, ClientType clientType, String userAgent) {
        return new LoginResult(
                tokenProvider.generateAccessToken(user.getEmail(), user.getRoleCode()),
                refreshTokenService.issue(user, clientType, userAgent),
                tokenProvider.getAccessTokenValiditySeconds(),
                toResponse(user));
    }

    private UnauthorizedException failure(String email) {
        loginAttemptService.recordFailure(email);
        log.warn("Login fallido para {}", email);
        return new UnauthorizedException(GENERIC_FAILURE);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getFullName(),
                new RoleResponse(user.getRoleItem().getId(), user.getRoleItem().getCode(),
                        user.getRoleItem().getLabel()),
                user.isActive(),
                user.getLastLogin(),
                user.isMustChangePassword());
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
