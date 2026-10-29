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
@Table(name = "interventions")
@Getter
@Setter
@NoArgsConstructor
public class Intervention extends BaseEntity {
    @Column(name = "code")
    private String code;
    @Column(name = "version")
    private Long version;
    @Column(name = "intervention_class_item_id")
    private Long interventionClassItemId;
    @Column(name = "intervention_type_item_id")
    private Long interventionTypeItemId;
    @Column(name = "planning_status_item_id")
    private Long planningStatusItemId;
    @Column(name = "team_id")
    private Long teamId;
    @Column(name = "assigned_to_user_id")
    private Long assignedToUserId;
    @Column(name = "assigned_by_user_id")
    private Long assignedByUserId;
    @Column(name = "created_by_user_id")
    private Long createdByUserId;
    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;
    @Column(name = "description")
    private String description;
    @Column(name = "origin_item_id")
    private Long originItemId;
    @Column(name = "reported_by_item_id")
    private Long reportedByItemId;
    @Column(name = "external_code")
    private String externalCode;
    @Column(name = "requested_at")
    private LocalDate requestedAt;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(name = "publication_attempts")
    private int publicationAttempts;
    @Column(name = "publication_error")
    private String publicationError;
}

