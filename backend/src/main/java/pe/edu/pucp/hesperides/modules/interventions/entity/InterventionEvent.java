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
@Table(name = "intervention_events")
@Getter
@Setter
@NoArgsConstructor
public class InterventionEvent extends BaseEntity {
    @Column(name = "intervention_id")
    private Long interventionId;
    @Column(name = "intervention_location_id")
    private Long interventionLocationId;
    @Column(name = "attempt_number")
    private Integer attemptNumber;
    @Column(name = "action_code")
    private String actionCode;
    @Column(name = "actor_user_id")
    private Long actorUserId;
    @Column(name = "from_status_item_id")
    private Long fromStatusItemId;
    @Column(name = "to_status_item_id")
    private Long toStatusItemId;
    @Column(name = "reason")
    private String reason;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private Map<String,Object> details;
    @Column(name = "occurred_at")
    private Instant occurredAt;
}

