package pe.edu.pucp.hesperides.modules.incidents.service;

import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;

public interface IncidentsService {
    record CreationResult(DetailResponse detail, boolean created) {}
    Page<IncidentResponse> getAll(String email,String search,String status,int page,int size,ListFilter filter);
    default Page<IncidentResponse> getAll(String email,String search,String status,int page,int size) {
        return getAll(email,search,status,page,size,new ListFilter(null,null,null,null,null));
    }
    DetailResponse getById(Long id, String email);
    OptionsResponse options(String email);
    SummaryResponse summary(String email);
    MyReportsResponse myReports(String email);
    ExportResponse export(String email);
    DetailResponse addComment(Long id, CommentRequest request, String email);
    CreationResult create(CreateIncidentRequest request, UUID reference, String email);
    DetailResponse update(Long id, ReviewIncidentRequest request, String email);
    DetailResponse approve(Long id, long version, String email);
    DetailResponse start(Long id, String email);
    DetailResponse requestCorrection(Long id, ReasonRequest request, String email);
    DetailResponse resubmit(Long id, CorrectionRequest request, String email);
    DetailResponse observeResolution(Long id, ReasonRequest request, String email);
    DetailResponse resolve(Long id, ResolutionRequest request, String email);
    DetailResponse linkIntervention(Long id, LinkInterventionRequest request, String email);
    DetailResponse unlinkIntervention(Long id, Long linkId, ReasonRequest request, String email);
    Page<LinkedInterventionResponse> interventionOptions(Long id, String search, int page, String email);
    Page<LinkedInterventionResponse> availableInterventions(String search,int page,String email);
    PhotoResponse addPhoto(Long id, UUID reference, MultipartFile file, String email);
    PhotoContentResponse getPhoto(Long id, Long photoId, String email);
}
