package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "interventions")
@Getter @Setter @NoArgsConstructor
public class Intervention extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Incident incident;
    @Column(nullable = false) private String description;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "type_item_id") private CatalogItem type;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "status_item_id") private CatalogItem status;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "recorded_by_user_id") private User recordedBy;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "completed_by_user_id") private User completedBy;
    private Instant completedAt;
    @Column(nullable = false) private UUID clientReference;
    @Column(nullable = false) private String requestHash;
}
