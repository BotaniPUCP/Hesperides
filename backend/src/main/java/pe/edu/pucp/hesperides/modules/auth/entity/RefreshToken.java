package pe.edu.pucp.hesperides.modules.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.Instant;

/**
 * Solo se guarda el hash SHA-256 del refresh token, nunca el token en claro:
 * si la tabla se filtra, no expone credenciales reutilizables.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "refresh_tokens")
public class RefreshToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, length = 255)
    private String tokenHash;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** Encadena la rotación: permite revocar toda la cadena ante un reuso. */
    @Column(name = "replaced_by_id")
    private Long replacedById;

    @Convert(converter = ClientTypeConverter.class)
    @Column(name = "client_type", nullable = false, length = 10)
    private ClientType clientType;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsable() {
        return !isRevoked() && !isExpired();
    }
}
