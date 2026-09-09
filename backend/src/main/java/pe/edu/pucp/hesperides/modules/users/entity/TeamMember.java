package pe.edu.pucp.hesperides.modules.users.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.Instant;

/**
 * Pertenencia de una persona a una cuadrilla, con historia: leftAt distinto de
 * null significa que ya salió, pero la fila permanece para no falsear a qué
 * equipo pertenecía cuando ejecutó una intervención pasada.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "team_members")
public class TeamMember extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    /** joinedAt tiene default en BD, pero JPA no lo lee al insertar: lo fija aquí. */
    @PrePersist
    void onJoin() {
        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
    }

    public boolean isCurrentMember() {
        return leftAt == null;
    }
}
