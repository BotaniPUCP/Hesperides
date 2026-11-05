package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.interventions.entity.Intervention;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

@Entity @Table(name = "incident_intervention_links") @Getter @Setter @NoArgsConstructor
public class IncidentInterventionLink extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Incident incident;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Intervention intervention;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "purpose_item_id") private CatalogItem purpose;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "linked_by_user_id") private User linkedBy;
}
