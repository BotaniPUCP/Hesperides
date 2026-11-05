package pe.edu.pucp.hesperides.modules.incidents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentInterventionLink;
import java.util.List;
import java.util.Optional;

public interface IncidentInterventionLinksRepository extends JpaRepository<IncidentInterventionLink, Long> {
    List<IncidentInterventionLink> findByIncidentIdAndDeletedAtIsNullOrderByIdAsc(Long incidentId);
    Optional<IncidentInterventionLink> findByIncidentIdAndInterventionIdAndDeletedAtIsNull(Long incidentId, Long interventionId);
}
