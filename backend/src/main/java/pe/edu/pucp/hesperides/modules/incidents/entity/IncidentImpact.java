package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

@Entity @Table(name = "incident_impacts") @Getter @Setter @NoArgsConstructor
public class IncidentImpact extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Incident incident;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "impact_item_id") private CatalogItem impact;
}
