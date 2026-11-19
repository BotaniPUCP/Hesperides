package pe.edu.pucp.hesperides.modules.interventions.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.time.Instant;
import java.util.UUID;

/** Additive global activity model (SPEC-200 stage 2); legacy execution is untouched. */
@Entity
@Table(name="activity_evidences")
@Getter
@Setter
@NoArgsConstructor
public class ActivityEvidence extends BaseEntity {
    @Column(name="intervention_id")
    private Long interventionId;
    @Column(name="progress_entry_id")
    private Long progressEntryId;
    @Column(name="intervention_location_id")
    private Long interventionLocationId;
    @Column(name="client_reference")
    private UUID clientReference;
    @Column(name="moment_item_id")
    private Long momentItemId;
    @Column(name="caption")
    private String caption;
    @Column(name="uploaded_by_user_id")
    private Long uploadedByUserId;
    @Column(name="storage_key")
    private String storageKey;
    @Column(name="original_filename")
    private String originalFilename;
    @Column(name="content_type")
    private String contentType;
    @Column(name="size_bytes")
    private Long sizeBytes;
    @Column(name="content_sha256")
    private String contentSha256;
    @Column(name="uploaded_at")
    private Instant uploadedAt;
}
