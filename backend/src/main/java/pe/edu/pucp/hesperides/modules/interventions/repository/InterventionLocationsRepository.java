package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionLocation;
import java.util.List;
import java.util.Optional;

public interface InterventionLocationsRepository extends JpaRepository<InterventionLocation, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from InterventionLocation l where l.id = :id and l.interventionId = :interventionId and l.deletedAt is null")
    Optional<InterventionLocation> findForUpdate(Long id, Long interventionId);
    List<InterventionLocation> findByInterventionIdAndDeletedAtIsNullOrderById(Long interventionId);
    List<InterventionLocation> findByInterventionIdOrderById(Long interventionId);
}

