package pe.edu.pucp.hesperides.modules.interventions.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.edu.pucp.hesperides.modules.interventions.dto.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.*;
import java.util.Map;
import java.util.UUID;

public interface InterventionsService {
    record Creation(InterventionDetailResponse intervention, boolean replay) {}
    record Announcement(InterventionEvidenceResponse evidence, boolean replay) {}
    record EvidenceFile(byte[] bytes, String contentType) {}
    Page<InterventionSummaryResponse> findAll(Filter filter, Pageable page);
    InterventionDetailResponse findById(Long id);
    Map<String,Object> options();
    Creation create(Planning request, UUID key);
    InterventionDetailResponse update(Long id, Planning request);
    InterventionDetailResponse assign(Long id, Assignment request);
    InterventionDetailResponse cancel(Long id, Cancellation request);
    InterventionDetailResponse start(Long id, Long locationId, Start request);
    InterventionDetailResponse saveExecution(Long id, Long locationId, Execution request);
    InterventionDetailResponse complete(Long id, Long locationId, Completion request);
    InterventionDetailResponse validateLocation(Long id, Long locationId, Review request);
    InterventionDetailResponse observe(Long id, Long locationId, Observation request);
    InterventionDetailResponse reopen(Long id, Long locationId, Review request);
    Announcement announceEvidence(Long id, Evidence request, UUID key);
    InterventionEvidenceResponse uploadEvidence(Long id, Long evidenceId, org.springframework.web.multipart.MultipartFile file);
    EvidenceFile evidenceFile(Long id, Long evidenceId);
}
