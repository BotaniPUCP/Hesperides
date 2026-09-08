package pe.edu.pucp.hesperides.modules.teams.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.teams.entity.TeamMember;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TeamMembersRepository extends JpaRepository<TeamMember, Long> {

    Optional<TeamMember> findByTeamIdAndUserIdAndLeftAtIsNull(Long teamId, Long userId);

    List<TeamMember> findByUserIdAndLeftAtIsNull(Long userId);

    /**
     * Miembros vigentes de un conjunto de cuadrillas: alcance de un SUPERVISOR.
     */
    List<TeamMember> findByTeamIdInAndLeftAtIsNull(Collection<Long> teamIds);

    /**
     * Carga los equipos vigentes de varios usuarios en una sola consulta, para
     * evitar N+1 al montar la página del listado.
     */
    List<TeamMember> findByUserIdInAndLeftAtIsNull(Collection<Long> userIds);
}