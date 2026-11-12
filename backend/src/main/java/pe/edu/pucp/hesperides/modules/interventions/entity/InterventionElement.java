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
@Table(name = "intervention_elements")
@Getter
@Setter
@NoArgsConstructor
public class InterventionElement extends BaseEntity {
    @Column(name = "intervention_id")
    private Long interventionId;
    @Column(name = "intervention_location_id")
    private Long interventionLocationId;
    @Column(name = "green_element_id")
    private Long greenElementId;
}

