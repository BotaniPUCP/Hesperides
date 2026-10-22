package pe.edu.pucp.hesperides.modules.interventions.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class InterventionDetailResponse extends InterventionSummaryResponse {
    private String description;
    private Long responsibleSupervisorUserId;
    private Long originItemId;
    private Long reportedByItemId;
    private String externalCode;
    private LocalDate requestedAt;
    private Instant createdAt;
    private Instant updatedAt;
    private List<Map<String,Object>> locations;
    private List<Map<String,Object>> evidences;
    private List<Map<String,Object>> history;
    private List<Map<String,Object>> quantityTotals;
    private boolean incidentIntegrationAvailable = false;
    private List<Object> sourceIncidents = List.of();
}

