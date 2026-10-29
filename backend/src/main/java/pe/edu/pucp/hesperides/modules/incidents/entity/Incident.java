package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "incidents")
@Getter @Setter @NoArgsConstructor
public class Incident extends BaseEntity {
    @Column(nullable = false, updatable = false) private String originalDescription;
    @Column(nullable = false) private String description;
    private String locationReference;
    private Double latitude;
    private Double longitude;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "incident_type_item_id")
    private CatalogItem incidentType;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "urgency_item_id")
    private CatalogItem urgency;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "status_item_id")
    private CatalogItem status;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "reported_by_user_id")
    private User reportedBy;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id") private Team team;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "approved_by_user_id") private User approvedBy;
    private Instant approvedAt;
    private Instant resolvedAt;
    @Column(nullable = false) private String channel = "WEB";
    @Column(nullable = false, updatable = false) private UUID clientReference;
    @Column(nullable = false, updatable = false) private String requestHash;
    @Version private long version;
}
