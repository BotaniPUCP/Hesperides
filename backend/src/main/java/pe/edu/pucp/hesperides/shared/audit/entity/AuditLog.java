package pe.edu.pucp.hesperides.shared.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;

import java.time.Instant;
import java.util.Map;

/**
 * Bitácora de acciones administrativas sensibles. Append-only por diseño
 * (SPEC-004 §6): a diferencia de toda otra tabla del proyecto no lleva
 * updated_at ni deleted_at, y no extiende BaseEntity a propósito — no hay
 * "estado vigente" que editar en el registro de un hecho pasado.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Valor de AuditActionCode, no FK a catálogo (SPEC-004 §3.1). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private AuditActionCode action;

    /** Nombre lógico de la entidad: simpleName() de la JPA, no el nombre de tabla. */
    @Column(name = "entity_type", nullable = false, length = 60)
    private String entityType;

    /** Nulable: LOGIN_FAILED_LOCKOUT no tiene fila de dominio asociada. */
    @Column(name = "entity_id")
    private Long entityId;

    /** Quién ejecutó la acción. Nulable: acciones de sistema o pre-autenticación. */
    @Column(name = "user_id")
    private Long userId;

    /** Origen del request; NULL cuando no hay request HTTP (job, arranque). */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** Solo los campos que cambiaron: {"campo": {"before":…, "after":…}}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "changes")
    private Map<String, Object> changes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}