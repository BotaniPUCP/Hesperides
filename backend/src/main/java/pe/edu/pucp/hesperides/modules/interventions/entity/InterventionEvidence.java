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
@Table(name = "intervention_evidences")
@Getter
@Setter
@NoArgsConstructor
public class InterventionEvidence extends BaseEntity {
    @Column(name = "intervention_id")
    private Long interventionId;
    @Column(name = "intervention_location_id")
    private Long interventionLocationId;
    @Column(name = "attempt_number")
    private int attemptNumber;
    @Column(name = "green_element_id")
    private Long greenElementId;
    @Column(name = "client_reference")
    private UUID clientReference;
    @Column(name = "moment_item_id")
    private Long momentItemId;
    @Column(name = "storage_key")
    private String storageKey;
    @Column(name = "original_filename")
    private String originalFilename;
    @Column(name = "content_type")
    private String contentType;
    @Column(name = "size_bytes")
    private Long sizeBytes;
    @Column(name = "content_sha256")
    private String contentSha256;
    @Column(name = "captured_at")
    private Instant capturedAt;
    @ColumnTransformer(read = "ST_AsText(captured_location,17)", write = "ST_GeomFromText(?,4326)")
    @Column(name = "captured_location", columnDefinition = "geometry(Point,4326)")
    private String capturedLocation;
    @Column(name = "caption")
    private String caption;
    @Column(name = "uploaded_by_user_id")
    private Long uploadedByUserId;
    @Column(name = "uploaded_at")
    private Instant uploadedAt;
}

