package pe.edu.pucp.hesperides.modules.campusevents.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.pucp.hesperides.modules.campusevents.entity.CampusEvent;

import java.util.Optional;

public interface CampusEventsRepository extends JpaRepository<CampusEvent, Long> {

    @Query("SELECT e FROM CampusEvent e WHERE e.id = :id AND e.deletedAt IS NULL")
    Optional<CampusEvent> findActive(Long id);
}
