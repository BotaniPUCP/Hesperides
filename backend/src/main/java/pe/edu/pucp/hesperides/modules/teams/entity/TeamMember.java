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

import java.time.Instant;

/**
 * Pertenencia de un usuario a una cuadrilla, con historia: left_at relleno
 * significa que ya no es miembro vigente pero sigue siendo el equipo donde
 * estuvo cuando ejecutó una intervención antigua (SPEC-002 §4.10).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "team_members")
public class TeamMember extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    @Column(name = "left_at")
    private Instant leftAt;

    public boolean isCurrent() {
        return leftAt == null;
    }
}