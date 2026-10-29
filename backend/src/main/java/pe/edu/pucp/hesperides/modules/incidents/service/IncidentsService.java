package pe.edu.pucp.hesperides.modules.incidents.service;

import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;

public interface IncidentsService {
    record CreationResult(DetailResponse detail, boolean created) {}
    Page<IncidentResponse> getAll(String email, String search, String status, int page, int size);
    DetailResponse getById(Long id, String email);
    OptionsResponse options(String email);
    SummaryResponse summary(String email);
    CreationResult create(CreateIncidentRequest request, UUID reference, String email);
    DetailResponse update(Long id, ReviewIncidentRequest request, String email);
    DetailResponse approve(Long id, long version, String email);
    DetailResponse start(Long id, String email);
    DetailResponse resolve(Long id, String email);
    DetailResponse addIntervention(Long id, CreateInterventionRequest request, String email);
    DetailResponse completeIntervention(Long id, Long workId, String email);
    PhotoResponse addPhoto(Long id, UUID reference, MultipartFile file, String email);
    PhotoContentResponse getPhoto(Long id, Long photoId, String email);
}
