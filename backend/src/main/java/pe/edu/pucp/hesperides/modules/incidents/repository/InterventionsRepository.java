package pe.edu.pucp.hesperides.modules.incidents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.pucp.hesperides.modules.incidents.entity.Intervention;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterventionsRepository extends JpaRepository<Intervention, Long> {
    List<Intervention> findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long id);
    Optional<Intervention> findByIncidentIdAndClientReferenceAndDeletedAtIsNull(Long id, UUID reference);
    Optional<Intervention> findByIdAndIncidentIdAndDeletedAtIsNull(Long id, Long incidentId);
    @Query("select count(w) from Intervention w where w.deletedAt is null and w.incident.deletedAt is null and w.status.code = 'COMPLETED'")
    long countCompleted();
}
