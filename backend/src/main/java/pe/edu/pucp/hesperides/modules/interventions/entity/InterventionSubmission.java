package pe.edu.pucp.hesperides.modules.interventions.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.Map;

/** Persistence for SPEC-200; catalog references are IDs, never domain enums. */
@Entity
@Table(name = "intervention_submissions")
@Getter
@Setter
@NoArgsConstructor
public class InterventionSubmission extends BaseEntity {
    @Column(name = "actor_user_id")
    private Long actorUserId;
    @Column(name = "operation")
    private String operation;
    @Column(name = "idempotency_key")
    private UUID idempotencyKey;
    @Column(name = "request_sha256")
    private String requestSha256;
    @Column(name = "intervention_id")
    private Long interventionId;
    @Column(name = "evidence_id")
    private Long evidenceId;
    @Column(name = "expires_at")
    private Instant expiresAt;
}

