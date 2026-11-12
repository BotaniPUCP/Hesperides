package pe.edu.pucp.hesperides.modules.incidents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentIntervention;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentInterventionsRepository extends JpaRepository<IncidentIntervention, Long> {
    List<IncidentIntervention> findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long id);
    Optional<IncidentIntervention> findByIncidentIdAndClientReferenceAndDeletedAtIsNull(Long id, UUID reference);
    Optional<IncidentIntervention> findByIdAndIncidentIdAndDeletedAtIsNull(Long id, Long incidentId);
    @Query("select count(w) from IncidentIntervention w where w.deletedAt is null and w.incident.deletedAt is null and w.status.code = 'COMPLETED'")
    long countCompleted();
}
