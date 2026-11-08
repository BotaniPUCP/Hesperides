package pe.edu.pucp.hesperides.modules.irrigation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@Table(name = "irrigation_pump_readings")
public class IrrigationPumpReading extends BaseEntity {
    @Column(name = "reading_date", nullable = false)
    private LocalDate readingDate;
    @Column(name = "recorded_by_user_id", nullable = false)
    private Long recordedByUserId;
    @Column(name = "initial_meter_hours", nullable = false, precision = 12, scale = 3)
    private BigDecimal initialMeterHours;
    @Column(name = "final_meter_hours", nullable = false, precision = 12, scale = 3)
    private BigDecimal finalMeterHours;
    @Column(name = "reservoir_level_percent", nullable = false, precision = 6, scale = 3)
    private BigDecimal reservoirLevelPercent;
    @Column(name = "flow_m3_per_hour", nullable = false, precision = 12, scale = 3)
    private BigDecimal flowM3PerHour;
    @Column(name = "daily_limit_hours", nullable = false, precision = 5, scale = 3)
    private BigDecimal dailyLimitHours;
}
