package pe.edu.pucp.hesperides.modules.incidents.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import java.util.Optional;
import java.util.UUID;

public interface IncidentsRepository extends JpaRepository<Incident, Long>, JpaSpecificationExecutor<Incident> {
    Optional<Incident> findByReportedByIdAndClientReferenceAndDeletedAtIsNull(Long userId, UUID reference);
    Optional<Incident> findByIdAndDeletedAtIsNull(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Incident i where i.id = :id and i.deletedAt is null")
    Optional<Incident> lockById(Long id);
    long countByStatusCodeAndDeletedAtIsNull(String code);
}
