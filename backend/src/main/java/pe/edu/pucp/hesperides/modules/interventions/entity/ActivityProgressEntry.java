package pe.edu.pucp.hesperides.modules.interventions.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Additive global activity model (SPEC-200 stage 2); legacy execution is untouched. */
@Entity
@Table(name="activity_progress_entries")
@Getter
@Setter
@NoArgsConstructor
public class ActivityProgressEntry extends BaseEntity {
    @Column(name="intervention_id")
    private Long interventionId;
    @Column(name="client_reference")
    private UUID clientReference;
    @Column(name="request_sha256")
    private String requestSha256;
    @Column(name="actor_user_id")
    private Long actorUserId;
    @Column(name="progress_percentage")
    private BigDecimal progressPercentage;
    @Column(name="description")
    private String description;
    @Column(name="occurred_at")
    private Instant occurredAt;
}
