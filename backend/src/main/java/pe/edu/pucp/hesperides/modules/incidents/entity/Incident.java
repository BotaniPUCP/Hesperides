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
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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
    private Instant reviewedAt;
    private String correctionReason;
    private String resolutionSummary;
    private String resolutionObservation;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "resolved_by_user_id") private User resolvedBy;
    private Long officialNumber;
    private Long closureBusinessDays;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "event_item_id") private CatalogItem event;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_group_item_id") private CatalogItem serviceGroup;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_item_id") private CatalogItem service;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "company_item_id") private CatalogItem company;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "process_item_id") private CatalogItem process;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "subprocess_item_id") private CatalogItem subprocess;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "severity_item_id") private CatalogItem severity;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "responsible_user_id") private User responsible;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "root_cause_item_id") private CatalogItem rootCauseItem;
    @OneToMany(mappedBy = "incident", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    private List<IncidentImpact> impactAssignments = new ArrayList<>();
    private String immediateAction;
    private String rootCause;
    private String preventiveAction;
    private String impactedProcess;
    private String observations;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "intake_channel_item_id") private CatalogItem intakeChannel;
    private String reporterName;
    private Long zoneId;
    @Column(nullable = false) private String channel = "WEB";
    @Column(nullable = false, updatable = false) private UUID clientReference;
    @Column(nullable = false, updatable = false) private String requestHash;
    @Version private long version;

    @Transient
    public Set<CatalogItem> getImpacts() {
        return impactAssignments.stream().filter(a -> !a.isDeleted()).map(IncidentImpact::getImpact)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public void replaceImpacts(Set<CatalogItem> selected) {
        Set<Long> ids = selected.stream().map(CatalogItem::getId).collect(Collectors.toSet());
        impactAssignments.stream().filter(a -> !a.isDeleted() && !ids.contains(a.getImpact().getId())).forEach(IncidentImpact::softDelete);
        Set<Long> current = getImpacts().stream().map(CatalogItem::getId).collect(Collectors.toSet());
        for (CatalogItem item : selected) if (!current.contains(item.getId())) {
            IncidentImpact assignment = new IncidentImpact();
            assignment.setIncident(this); assignment.setImpact(item); impactAssignments.add(assignment);
        }
    }
}
