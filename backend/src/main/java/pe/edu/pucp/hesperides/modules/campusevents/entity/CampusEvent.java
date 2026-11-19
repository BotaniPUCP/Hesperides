package pe.edu.pucp.hesperides.modules.campusevents.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Un evento del campus (SPEC-114): guarda su regla, no sus ocurrencias, que se calculan con
 * {@code EventOccurrences} (D-01). Un feriado es siempre de todo el campus.
 */
@Entity
@Table(name = "campus_events")
@Getter
@Setter
@NoArgsConstructor
public class CampusEvent extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "type_item_id", nullable = false)
    private Long typeItemId;

    /** {@code CAMPUS}, {@code SECTOR} o {@code SECTION}: el valor de {@code EventScope}. */
    @Column(nullable = false, length = 10)
    private String scope;

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    /** Días ISO (1 = lunes); nulo = todos los días de las fechas. */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "smallint[]")
    private Short[] weekdays;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(nullable = false)
    private Long version;
}
