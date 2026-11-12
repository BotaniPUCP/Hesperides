package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionEvent;
import java.util.List;
import java.util.Optional;

public interface InterventionEventsRepository extends JpaRepository<InterventionEvent, Long> {
    List<InterventionEvent> findByInterventionIdAndDeletedAtIsNullOrderByOccurredAtAscIdAsc(Long interventionId);
}

