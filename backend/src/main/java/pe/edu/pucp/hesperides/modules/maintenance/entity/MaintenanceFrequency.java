package pe.edu.pucp.hesperides.modules.maintenance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Regla de frecuencia o periodicidad de mantenimiento para una actividad o subactividad.
 * Soporta rangos operativos de días, cuotas anuales/estacionales, ventanas de tiempo
 * y ciclos de cobertura (SPEC-101).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "maintenance_frequencies")
@SQLRestriction("deleted_at IS NULL")
public class MaintenanceFrequency extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_type_item_id", nullable = false)
    private CatalogItem activityTypeItem;

    @Column(nullable = false, length = 20)
    private String regime = "IN_HOUSE";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "frequency_rule_type_item_id", nullable = false)
    private CatalogItem frequencyRuleTypeItem;

    @Column(nullable = false, length = 30)
    private String scope = "CAMPUS_WIDE";

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "target_days_interval")
    private Integer targetDaysInterval;

    @Column(name = "min_days_interval")
    private Integer minDaysInterval;

    @Column(name = "max_days_interval")
    private Integer maxDaysInterval;

    @Column(name = "annual_target_count")
    private Integer annualTargetCount;

    @Column(name = "season_modifier", length = 255)
    private String seasonModifier;

    @Column(name = "coverage_target_days")
    private Integer coverageTargetDays;

    @Column(name = "estimated_duration_days")
    private Integer estimatedDurationDays;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
