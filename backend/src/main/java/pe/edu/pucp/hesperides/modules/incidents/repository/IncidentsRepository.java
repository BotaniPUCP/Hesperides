package pe.edu.pucp.hesperides.modules.incidents.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentsRepository extends JpaRepository<Incident, Long>, JpaSpecificationExecutor<Incident> {
    Optional<Incident> findByReportedByIdAndClientReferenceAndDeletedAtIsNull(Long userId, UUID reference);
    Optional<Incident> findByIdAndDeletedAtIsNull(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Incident i where i.id = :id and i.deletedAt is null")
    Optional<Incident> lockById(Long id);

    /** Casos cerrados del mismo tipo cuya solución sirve de referencia (SPEC-201 §9, recurrencia). */
    List<Incident> findTop3ByIncidentTypeIdAndIdNotAndClosedAtIsNotNullAndResolutionSummaryIsNotNullAndDeletedAtIsNullOrderByClosedAtDesc(
            Long typeId, Long excludedId);

    List<Incident> findByReportedByIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(Long userId);
}
