package pe.edu.pucp.hesperides.modules.maintenance.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.frequency.SeasonalInterval;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Una version de la regla de periodicidad de una actividad.
 *
 * <p><strong>Version, no regla:</strong> editar los parametros no actualiza
 * esta fila, cierra su vigencia y crea otra. Sin eso, relajar un limite en
 * noviembre volveria cumplidos los meses ya evaluados como incumplidos, y el
 * historico de cumplimiento dejaria de ser defendible ante la jefatura.
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

    /**
     * IN_HOUSE u OUTSOURCED. Importa porque la fuente de autoridad del numero es
     * distinta: una frecuencia propia nace de la dinamica interna del equipo,
     * una tercerizada esta fijada en un contrato que la seccion no controla.
     */
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

    @Column(name = "coverage_target_days")
    private Integer coverageTargetDays;

    @Column(name = "estimated_duration_days")
    private Integer estimatedDurationDays;

    /** Ventana anual. start > end es valido: la poda mayor va de diciembre a enero. */
    @Column(name = "season_start_month")
    private Short seasonStartMonth;

    @Column(name = "season_end_month")
    private Short seasonEndMonth;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom = LocalDate.now();

    /** Null es la version vigente. */
    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /**
     * Intervalos por estacion. Vacio significa "uniforme todo el ano".
     *
     * <p>Sustituye al resumen de texto que guardaba "Verano: 30-35d": se leia
     * bien pero ningun calculo podia saber si se cumplio, y un dato que solo
     * sirve para mostrarse no sostiene un reporte de cumplimiento.
     */
    @OneToMany(mappedBy = "maintenanceFrequency", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("startMonth ASC")
    private List<MaintenanceFrequencySeason> seasons = new ArrayList<>();

    public boolean isCurrent() {
        return validTo == null;
    }

    public void addSeason(MaintenanceFrequencySeason season) {
        season.setMaintenanceFrequency(this);
        seasons.add(season);
    }

    /**
     * Traduce esta fila al record puro que entiende el Engine.
     *
     * <p>La conversion vive aqui y no en el Engine a proposito: el Engine no
     * debe conocer JPA ni esta entidad, porque en cuanto la conozca deja de
     * poder probarse sin base de datos.
     */
    public FrequencyRule toRule() {
        List<SeasonalInterval> intervals = seasons.stream()
                .map(s -> new SeasonalInterval(
                        s.getSeason(),
                        s.getStartMonth(),
                        s.getEndMonth(),
                        s.getMinDaysInterval(),
                        s.getMaxDaysInterval(),
                        s.getTargetDaysInterval()))
                .toList();

        return new FrequencyRule(
                getId(),
                frequencyRuleTypeItem.getCode(),
                targetDaysInterval,
                minDaysInterval,
                maxDaysInterval,
                annualTargetCount,
                coverageTargetDays,
                seasonStartMonth == null ? null : seasonStartMonth.intValue(),
                seasonEndMonth == null ? null : seasonEndMonth.intValue(),
                intervals,
                validFrom,
                validTo);
    }
}
