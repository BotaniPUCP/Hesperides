package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionElement;
import java.util.List;
import java.util.Optional;

public interface InterventionElementsRepository extends JpaRepository<InterventionElement, Long> {
    List<InterventionElement> findByInterventionLocationIdAndDeletedAtIsNull(Long interventionLocationId);
}

