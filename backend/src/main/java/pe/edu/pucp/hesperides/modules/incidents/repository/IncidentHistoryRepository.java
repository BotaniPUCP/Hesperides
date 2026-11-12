package pe.edu.pucp.hesperides.modules.incidents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentStatusHistory;
import java.util.List;

public interface IncidentHistoryRepository extends JpaRepository<IncidentStatusHistory, Long> {
    List<IncidentStatusHistory> findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long id);
}
