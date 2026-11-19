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

/** Additive global activity model (SPEC-200 stage 2); legacy execution is untouched. */
@Entity
@Table(name="activity_executions")
@Getter
@Setter
@NoArgsConstructor
public class ActivityExecution extends BaseEntity {
    @Column(name="intervention_id")
    private Long interventionId;
    @Column(name="version")
    private Long version;
    @Column(name="responsible_supervisor_user_id")
    private Long responsibleSupervisorUserId;
    @Column(name="status_item_id")
    private Long statusItemId;
    @Column(name="progress_percentage")
    private BigDecimal progressPercentage;
    @Column(name="started_at")
    private Instant startedAt;
    @Column(name="executed_at")
    private Instant executedAt;
    @Column(name="finished_at")
    private Instant finishedAt;
    @Column(name="finished_by_user_id")
    private Long finishedByUserId;
    @Column(name="cancelled_at")
    private Instant cancelledAt;
    @Column(name="cancelled_by_user_id")
    private Long cancelledByUserId;
    @Column(name="cancellation_reason")
    private String cancellationReason;
}
