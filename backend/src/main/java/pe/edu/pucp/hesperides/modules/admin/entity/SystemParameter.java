package pe.edu.pucp.hesperides.modules.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Un parámetro general del sistema: un valor único y tipado que el administrador
 * puede cambiar sin desplegar código (SPEC-002 §4.9).
 *
 * No extiende {@code Auditable}: se edita, no se "da de alta" por un usuario en
 * el sentido operativo (SPEC-004 §4.3); lo que importa auditar es la edición, ya
 * cubierta por {@code SYSTEM_PARAMETER_CHANGED}.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "system_parameters")
public class SystemParameter extends BaseEntity {

    @Column(nullable = false, length = 60)
    private String code;

    @Column(nullable = false, length = 150)
    private String label;

    @Column(columnDefinition = "text")
    private String value;

    @Column(name = "value_type", nullable = false, length = 20)
    private String valueType;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "is_editable", nullable = false)
    private boolean editable = true;
}