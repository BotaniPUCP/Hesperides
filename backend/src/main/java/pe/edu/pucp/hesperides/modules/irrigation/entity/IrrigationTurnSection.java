package pe.edu.pucp.hesperides.modules.irrigation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

@Entity
@Getter @Setter @NoArgsConstructor
@Table(name = "irrigation_turn_sections")
public class IrrigationTurnSection extends BaseEntity {
    @Column(name = "turn_id", nullable = false)
    private Long turnId;
    @Column(name = "section_zone_id", nullable = false)
    private Long sectionZoneId;
}
