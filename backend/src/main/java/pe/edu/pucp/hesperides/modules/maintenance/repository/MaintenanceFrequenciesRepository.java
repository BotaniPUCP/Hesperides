package pe.edu.pucp.hesperides.modules.maintenance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MaintenanceFrequenciesRepository extends JpaRepository<MaintenanceFrequency, Long> {

    /**
     * El listado de la pantalla: solo lo VIGENTE.
     *
     * <p>Las versiones cerradas existen y son consultables por su historial,
     * pero mezclarlas aqui mostraria la misma actividad varias veces y nadie
     * sabria cual rige hoy.
     */
    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE mf.validTo IS NULL "
            + "AND (:regime IS NULL OR mf.regime = :regime) "
            + "AND (:activityTypeItemId IS NULL OR mf.activityTypeItem.id = :activityTypeItemId) "
            + "AND (:active IS NULL OR mf.active = :active) "
            + "ORDER BY act.label ASC")
    List<MaintenanceFrequency> searchCurrent(
            @Param("regime") String regime,
            @Param("activityTypeItemId") Long activityTypeItemId,
            @Param("active") Boolean active
    );

    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE mf.id = :id")
    Optional<MaintenanceFrequency> findByIdWithDetails(@Param("id") Long id);

    /**
     * Todas las versiones de una actividad, de la mas antigua a la mas reciente.
     * Es lo que responde "por que este mes se juzgo asi".
     */
    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE mf.activityTypeItem.id = :activityTypeItemId "
            + "AND (:regime IS NULL OR mf.regime = :regime) "
            + "ORDER BY mf.validFrom ASC")
    List<MaintenanceFrequency> findHistory(
            @Param("activityTypeItemId") Long activityTypeItemId,
            @Param("regime") String regime
    );

    /**
     * Las versiones que solapan un periodo, para evaluar cada tramo con la suya.
     * valid_to inclusivo: el ultimo dia de vigencia todavia cuenta.
     */
    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE mf.activityTypeItem.id = :activityTypeItemId "
            + "AND mf.validFrom <= :to "
            + "AND (mf.validTo IS NULL OR mf.validTo >= :from) "
            + "ORDER BY mf.validFrom ASC")
    List<MaintenanceFrequency> findVersionsOverlapping(
            @Param("activityTypeItemId") Long activityTypeItemId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    /** Toda frecuencia vigente, para el reporte de cumplimiento del campus. */
    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "JOIN FETCH mf.activityTypeItem act "
            + "JOIN FETCH mf.frequencyRuleTypeItem frt "
            + "WHERE mf.validTo IS NULL AND mf.active = TRUE "
            + "ORDER BY act.label ASC")
    List<MaintenanceFrequency> findAllCurrent();

    /**
     * Detecta el choque contra el indice unico parcial antes de que lo lance la
     * base: asi el usuario recibe un 409 con un mensaje que explica el conflicto
     * en vez de un error de constraint.
     */
    @Query("SELECT mf FROM MaintenanceFrequency mf "
            + "WHERE mf.validTo IS NULL "
            + "AND mf.activityTypeItem.id = :activityTypeItemId "
            + "AND mf.regime = :regime "
            + "AND mf.scope = :scope "
            + "AND ((:zoneId IS NULL AND mf.zoneId IS NULL) OR (mf.zoneId = :zoneId)) "
            + "AND (:excludeId IS NULL OR mf.id <> :excludeId)")
    Optional<MaintenanceFrequency> findDuplicateCurrent(
            @Param("activityTypeItemId") Long activityTypeItemId,
            @Param("regime") String regime,
            @Param("scope") String scope,
            @Param("zoneId") Long zoneId,
            @Param("excludeId") Long excludeId
    );
}
