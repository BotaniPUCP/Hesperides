package pe.edu.pucp.hesperides.modules.planning.sets.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.planning.sets.entity.GreenAreaSet;

import java.util.List;
import java.util.Optional;

public interface GreenAreaSetsRepository extends JpaRepository<GreenAreaSet, Long> {

    @Query("SELECT s FROM GreenAreaSet s WHERE s.id = :id AND s.deletedAt IS NULL")
    Optional<GreenAreaSet> findActiveById(@Param("id") Long id);

    @Query("SELECT s FROM GreenAreaSet s WHERE s.deletedAt IS NULL ORDER BY lower(s.name)")
    List<GreenAreaSet> findAllActive();

    /** Mismo criterio que el índice único parcial: activos y sin distinguir mayúsculas. */
    @Query("SELECT COUNT(s) > 0 FROM GreenAreaSet s WHERE s.deletedAt IS NULL "
            + "AND lower(s.name) = lower(:name) AND (:excludeId IS NULL OR s.id <> :excludeId)")
    boolean existsActiveNameIgnoringCase(@Param("name") String name, @Param("excludeId") Long excludeId);
}
