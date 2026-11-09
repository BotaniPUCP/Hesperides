package pe.edu.pucp.hesperides.modules.planning.sets.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Una lista guardada de secciones con nombre (SPEC-203 D-01). Sus secciones y
 * sus actividades viven en tablas hijas que {@code GreenAreaSetQueries} reemplaza
 * enteras al editar: no tienen identidad propia que conservar.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "green_area_sets")
public class GreenAreaSet extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    /** Control optimista manual: cambiar solo las secciones no ensucia la fila. */
    @Column(nullable = false)
    private long version;
}
