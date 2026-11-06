package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.util.UUID;

@Entity @Table(name = "incident_updates") @Getter @Setter @NoArgsConstructor
public class IncidentUpdate extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Incident incident;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "author_user_id") private User author;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "kind_item_id") private CatalogItem kind;
    @Column(nullable = false) private String body;
    @Column(nullable = false, updatable = false) private UUID clientReference;
    @Column(nullable = false, updatable = false) private String requestHash;
}
