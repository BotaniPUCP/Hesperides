package pe.edu.pucp.hesperides.shared.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** Firma y valida el access token. No consulta la base de datos. */
@Slf4j
@Component
public class JwtTokenProvider {

    private static final String ROLE_CLAIM = "role";

    private final SecretKey signingKey;

    @Getter
    private final long accessTokenValiditySeconds;

    @Getter
    private final long refreshTokenValidityDays;

    public JwtTokenProvider(
            @Value("${hesperides.security.jwt.secret}") String secret,
            @Value("${hesperides.security.jwt.access-token-validity-seconds}") long accessTokenValiditySeconds,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long refreshTokenValidityDays) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValiditySeconds = accessTokenValiditySeconds;
        this.refreshTokenValidityDays = refreshTokenValidityDays;
    }

    public String generateAccessToken(String email, String roleCode) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim(ROLE_CLAIM, roleCode)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTokenValiditySeconds)))
                .signWith(signingKey)
                .compact();
    }

    /** Devuelve false ante cualquier token inválido; nunca propaga la excepción. */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Token rechazado: {}", ex.getMessage());
            return false;
        }
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractRoleCode(String token) {
        return parseClaims(token).get(ROLE_CLAIM, String.class);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}