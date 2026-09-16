package pe.edu.pucp.hesperides.modules.maintenance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;

import java.util.List;
import java.util.Optional;

public interface MaintenanceFrequenciesRepository extends JpaRepository<MaintenanceFrequency, Long> {

    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE (:regime IS NULL OR mf.regime = :regime) "
            + "AND (:activityTypeItemId IS NULL OR mf.activityTypeItem.id = :activityTypeItemId) "
            + "AND (:active IS NULL OR mf.active = :active) "
            + "ORDER BY act.label ASC")
    List<MaintenanceFrequency> searchFrequencies(
            @Param("regime") String regime,
            @Param("activityTypeItemId") Long activityTypeItemId,
            @Param("active") Boolean active
    );

    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE mf.id = :id")
    Optional<MaintenanceFrequency> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "WHERE mf.activityTypeItem.id = :activityTypeItemId "
            + "AND mf.regime = :regime "
            + "AND mf.scope = :scope "
            + "AND ((:zoneId IS NULL AND mf.zoneId IS NULL) OR (mf.zoneId = :zoneId)) "
            + "AND (:excludeId IS NULL OR mf.id <> :excludeId)")
    Optional<MaintenanceFrequency> findDuplicateActive(
            @Param("activityTypeItemId") Long activityTypeItemId,
            @Param("regime") String regime,
            @Param("scope") String scope,
            @Param("zoneId") Long zoneId,
            @Param("excludeId") Long excludeId
    );
}
