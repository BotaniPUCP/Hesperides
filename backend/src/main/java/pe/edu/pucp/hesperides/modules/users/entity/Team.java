package pe.edu.pucp.hesperides.modules.users.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Cuadrilla de trabajo (SPEC-002 §4.10). Un supervisor la dirige; los operarios
 * pertenecen a ella a través de TeamMember.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "teams")
public class Team extends BaseEntity {

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    /**
     * Se guarda el id y no un @ManyToOne a User: la relación solo se navega en
     * sentido inverso (qué cuadrillas dirige alguien), y un ManyToOne aquí
     * arrastraría el usuario completo en cada consulta de cuadrillas.
     */
    @Column(name = "supervisor_user_id", nullable = false)
    private Long supervisorUserId;

    /** Nulable: una cuadrilla puede ser polivalente (SPEC-002 §4.10). */
    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
