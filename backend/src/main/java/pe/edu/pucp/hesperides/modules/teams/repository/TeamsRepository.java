package pe.edu.pucp.hesperides.modules.teams.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.teams.entity.Team;

import java.util.List;
import java.util.Optional;

public interface TeamsRepository extends JpaRepository<Team, Long> {

    Optional<Team> findByCodeAndDeletedAtIsNull(String code);

    /**
     * Cuadrillas que dirige un supervisor (SPECT-C01): su alcance de lectura
     * en el listado de usuarios es sus miembros vigentes (SPEC-100 CA-07).
     */
    List<Team> findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNull(Long supervisorUserId);

    /**
     * Cuadrillas activas para el select de filtro del listado de usuarios
     * (SPEC-100 §7.1). No expone los miembros históricos ni las inactivas.
     */
    List<Team> findAllByActiveTrueAndDeletedAtIsNullOrderByNameAsc();
}