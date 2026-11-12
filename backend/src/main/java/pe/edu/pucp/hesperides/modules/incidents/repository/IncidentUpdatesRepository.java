package pe.edu.pucp.hesperides.modules.incidents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentUpdate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentUpdatesRepository extends JpaRepository<IncidentUpdate, Long> {
    List<IncidentUpdate> findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long incidentId);
    Optional<IncidentUpdate> findByIncidentIdAndClientReferenceAndDeletedAtIsNull(Long incidentId, UUID reference);
}
