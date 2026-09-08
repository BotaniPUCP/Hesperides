package pe.edu.pucp.hesperides.modules.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.RefreshToken;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.service.AuditService;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * Emite y rota refresh tokens. El token en claro existe solo el instante que
 * tarda en viajar al cliente: en base solo queda su hash SHA-256.
 */
@Slf4j
@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokensRepository refreshTokensRepository;
    private final long validityDays;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokensRepository refreshTokensRepository,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long validityDays,
            AuditService auditService) {
        this.refreshTokensRepository = refreshTokensRepository;
        this.validityDays = validityDays;
        this.auditService = auditService;
    }

    /** Devuelve el token en claro; el llamador es responsable de entregarlo y olvidarlo. */
    @Transactional
    public String issue(User user, ClientType clientType, String userAgent) {
        return issueEntity(user, clientType, userAgent).rawToken();
    }

    /**
     * Igual que issue(), pero devuelve también la fila persistida. La rotación
     * la necesita para encadenar replaced_by_id sin tener que volver a buscar
     * por hash, que dependería de que Hibernate ya hubiera hecho flush.
     */
    private IssuedToken issueEntity(User user, ClientType clientType, String userAgent) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        Instant now = Instant.now();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(rawToken));
        token.setIssuedAt(now);
        token.setExpiresAt(now.plus(validityDays, ChronoUnit.DAYS));
        token.setClientType(clientType);
        token.setUserAgent(userAgent);

        return new IssuedToken(refreshTokensRepository.saveAndFlush(token), rawToken);
    }

    private record IssuedToken(RefreshToken entity, String rawToken) {
    }

    /**
     * Rota el token: emite uno nuevo y revoca el usado. Si el token recibido ya
     * estaba revocado, se interpreta como reuso de un token robado y se revoca
     * la cadena entera del usuario.
     */
    @Transactional
    public RotationResult rotate(String rawToken, ClientType clientType, String userAgent) {
        RefreshToken existing = refreshTokensRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));

        if (existing.isRevoked()) {
            log.warn("Reuso de refresh token detectado para el usuario {}", existing.getUser().getId());
            int revoked = refreshTokensRepository.revokeAllForUser(existing.getUser().getId(), Instant.now());
            auditService.record(AuditActionCode.REFRESH_TOKEN_REUSE_DETECTED, "User",
                    existing.getUser().getId(),
                    Map.of("userId", existing.getUser().getId(), "tokenId", existing.getId(),
                            "revokedChainCount", revoked));
            throw new UnauthorizedException("Invalid or expired token");
        }

        if (existing.isExpired()) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        User owner = existing.getUser();
        IssuedToken issued = issueEntity(owner, clientType, userAgent);

        existing.setRevokedAt(Instant.now());
        existing.setReplacedById(issued.entity().getId());
        refreshTokensRepository.save(existing);

        return new RotationResult(owner, issued.rawToken());
    }

    @Transactional
    public int revokeAll(Long userId) {
        return refreshTokensRepository.revokeAllForUser(userId, Instant.now());
    }

    @Transactional
    public void revokeByRawToken(String rawToken) {
        refreshTokensRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            token.setRevokedAt(Instant.now());
            refreshTokensRepository.save(token);
        });
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible en esta JVM", ex);
        }
    }

    public record RotationResult(User user, String rawToken) {
    }
}