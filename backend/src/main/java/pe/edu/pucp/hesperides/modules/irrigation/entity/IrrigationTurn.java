package pe.edu.pucp.hesperides.modules.irrigation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Getter @Setter @NoArgsConstructor
@Table(name = "irrigation_turns")
public class IrrigationTurn extends BaseEntity {
    @Column(name = "sector_zone_id", nullable = false)
    private Long sectorZoneId;
    @Column(name = "supervisor_user_id", nullable = false)
    private Long supervisorUserId;
    @Column(name = "irrigation_date", nullable = false)
    private LocalDate irrigationDate;
    @Column(name = "started_at")
    private LocalTime startedAt;
    @Column(name = "finished_at")
    private LocalTime finishedAt;
    @Column(length = 500)
    private String notes;
    @Column(name = "water_source_item_id")
    private Long waterSourceItemId;
    @Column(name = "irrigation_method_item_id")
    private Long irrigationMethodItemId;
    @Column(name = "tanker_trips")
    private Integer tankerTrips;
    @Column(name = "tanker_volume_m3", precision = 12, scale = 3)
    private BigDecimal tankerVolumeM3;
    @Column(name = "window_exception_item_id")
    private Long windowExceptionItemId;
}
