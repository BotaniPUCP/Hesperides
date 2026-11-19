package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Incidencia de un área verde (SPEC-201). Zonas, organizaciones y contactos se guardan por id:
 * sus módulos los leen con JDBC y no tienen entidad JPA.
 */
@Entity
@Table(name = "incidents")
@Getter @Setter @NoArgsConstructor
public class Incident extends BaseEntity {
    @Column(nullable = false, updatable = false) private String code;
    private String title;
    @Column(nullable = false, updatable = false) private String originalDescription;
    @Column(nullable = false) private String description;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reported_urgency_item_id", updatable = false)
    private CatalogItem reportedUrgency;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "urgency_item_id") private CatalogItem urgency;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "incident_type_item_id") private CatalogItem incidentType;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "status_item_id") private CatalogItem status;
    private Long zoneId;
    private String locationReference;
    private Double latitude;
    private Double longitude;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id") private Team team;
    private boolean thirdParty;
    private Long providerOrganizationId;
    private Integer agreedDays;
    private String heightClass;
    private Long requestedByOrganizationId;
    private String requestedByName;
    private Long requesterContactId;
    private Long requestedForOrganizationId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "source_item_id") private CatalogItem source;
    private String externalCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "reported_by_user_id", updatable = false)
    private User reportedBy;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "activated_by_user_id") private User activatedBy;
    private Instant activatedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "closed_by_user_id") private User closedBy;
    private Instant closedAt;
    private String resolutionSummary;
    private Boolean deadlineMet;
    @Column(nullable = false) private String prefillStatus = "PENDING";
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> prefillSuggestion;
    private Instant prefillUpdatedAt;
    @JdbcTypeCode(SqlTypes.ARRAY) @Column(nullable = false) private List<String> editedFields = new ArrayList<>();
    @Column(nullable = false) private String channel = "WEB";
    @Column(nullable = false, updatable = false) private UUID clientReference;
    @Column(nullable = false, updatable = false) private String requestHash;
    @Version private long version;

    public boolean isActive() {
        return activatedAt != null;
    }

    public boolean isClosed() {
        return closedAt != null;
    }

    public boolean hasLocation() {
        return zoneId != null || latitude != null;
    }
}
