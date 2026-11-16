package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.interventions.entity.Intervention;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/** Un único vínculo N:M que se ve desde Incidencias y desde Intervenciones (SPEC-201 §3.8). */
@Entity @Table(name = "incident_intervention_links") @Getter @Setter @NoArgsConstructor
public class IncidentInterventionLink extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Incident incident;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Intervention intervention;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "linked_by_user_id") private User linkedBy;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "removed_by_user_id") private User removedBy;
    private String removalReason;

    public void remove(User actor, String reason) {
        removedBy = actor;
        removalReason = reason;
        softDelete();
    }
}
