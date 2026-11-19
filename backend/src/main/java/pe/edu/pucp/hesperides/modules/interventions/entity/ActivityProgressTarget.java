package pe.edu.pucp.hesperides.modules.interventions.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/** Additive global activity model (SPEC-200 stage 2); legacy execution is untouched. */
@Entity
@Table(name="activity_progress_targets")
@Getter
@Setter
@NoArgsConstructor
public class ActivityProgressTarget extends BaseEntity {
    @Column(name="progress_entry_id")
    private Long progressEntryId;
    @Column(name="intervention_id")
    private Long interventionId;
    @Column(name="intervention_location_id")
    private Long interventionLocationId;
    @Column(name="status_item_id")
    private Long statusItemId;
    @Column(name="partial_description")
    private String partialDescription;
}
