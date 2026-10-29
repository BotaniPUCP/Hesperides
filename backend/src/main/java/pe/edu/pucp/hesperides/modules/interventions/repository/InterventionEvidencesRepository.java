package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionEvidence;
import java.util.List;
import java.util.Optional;

public interface InterventionEvidencesRepository extends JpaRepository<InterventionEvidence, Long> {
    Optional<InterventionEvidence> findByClientReference(java.util.UUID clientReference);
    Optional<InterventionEvidence> findByIdAndInterventionIdAndDeletedAtIsNull(Long id, Long interventionId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from InterventionEvidence e where e.id=:id and e.interventionId=:interventionId and e.deletedAt is null")
    Optional<InterventionEvidence> findForUpdate(Long id, Long interventionId);
    List<InterventionEvidence> findByInterventionIdAndDeletedAtIsNullOrderById(Long interventionId);
}

