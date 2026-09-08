package pe.edu.pucp.hesperides.modules.teams.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Cuadrilla de trabajo (SPEC-002 §4.10). El supervisor dirige la cuadrilla;
 * la pertenencia de operarios vive en team_members.
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

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "supervisor_user_id", nullable = false)
    private User supervisorUser;

    /**
     * Zona habitual de la cuadrilla. El catalogo de zonas (SPEC-002 V004) no
     * existe en esta entrega, asi que se guarda el id desnudo; el FK consolida
     * el dia que aterrice la tabla zones.
     */
    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}