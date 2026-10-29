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
@Table(name = "intervention_locations")
@Getter
@Setter
@NoArgsConstructor
public class InterventionLocation extends BaseEntity {
    @Column(name = "intervention_id")
    private Long interventionId;
    @Column(name = "client_reference")
    private UUID clientReference;
    @Column(name = "zone_id")
    private Long zoneId;
    @Column(name = "place_id")
    private Long placeId;
    @ColumnTransformer(read = "ST_AsText(location)", write = "ST_GeomFromText(?,4326)")
    @Column(name = "location", columnDefinition = "geometry(Point,4326)")
    private String location;
    @Column(name = "location_description")
    private String locationDescription;
    @Column(name = "description")
    private String description;
    @Column(name = "status_item_id")
    private Long statusItemId;
    @Column(name = "unit_item_id")
    private Long unitItemId;
    @Column(name = "requested_quantity")
    private BigDecimal requestedQuantity;
    @Column(name = "progress_quantity")
    private BigDecimal progressQuantity;
    @Column(name = "executed_quantity")
    private BigDecimal executedQuantity;
    @Column(name = "attempt_number")
    private int attemptNumber;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "validated_at")
    private Instant validatedAt;
    @Column(name = "executed_by_user_id")
    private Long executedByUserId;
    @Column(name = "validated_by_user_id")
    private Long validatedByUserId;
    @Column(name = "execution_notes")
    private String executionNotes;
    @Column(name = "rejection_reason")
    private String rejectionReason;
}

