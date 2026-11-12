package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import pe.edu.pucp.hesperides.modules.interventions.entity.Intervention;
import java.util.List;
import java.util.Optional;

public interface InterventionsRepository extends JpaRepository<Intervention, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Intervention i where i.id = :id and i.deletedAt is null")
    Optional<Intervention> findForUpdate(Long id);
}

