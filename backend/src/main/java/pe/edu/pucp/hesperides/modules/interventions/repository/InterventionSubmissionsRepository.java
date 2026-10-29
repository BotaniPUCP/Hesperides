package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionSubmission;
import java.util.List;
import java.util.Optional;

public interface InterventionSubmissionsRepository extends JpaRepository<InterventionSubmission, Long> {
    Optional<InterventionSubmission> findByActorUserIdAndOperationAndIdempotencyKeyAndDeletedAtIsNull(
            Long actorUserId, String operation, java.util.UUID idempotencyKey);
}

