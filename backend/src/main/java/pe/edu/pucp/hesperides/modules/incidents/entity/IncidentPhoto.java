package pe.edu.pucp.hesperides.modules.incidents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import java.util.UUID;

@Entity @Table(name = "incident_photos")
@Getter @Setter @NoArgsConstructor
public class IncidentPhoto extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private Incident incident;
    @Column(nullable = false) private String storageKey;
    @Column(nullable = false) private String contentType;
    private long sizeBytes;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "uploaded_by_user_id") private User uploadedBy;
    @Column(nullable = false) private UUID clientReference;
    @Column(nullable = false) private String requestHash;
}
