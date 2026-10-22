package pe.edu.pucp.hesperides.modules.incidents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentPhoto;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentPhotosRepository extends JpaRepository<IncidentPhoto, Long> {
    List<IncidentPhoto> findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long id);
    Optional<IncidentPhoto> findByIncidentIdAndClientReferenceAndDeletedAtIsNull(Long id, UUID reference);
    Optional<IncidentPhoto> findByIdAndIncidentIdAndDeletedAtIsNull(Long id, Long incidentId);
    long countByIncidentIdAndDeletedAtIsNull(Long id);
}
