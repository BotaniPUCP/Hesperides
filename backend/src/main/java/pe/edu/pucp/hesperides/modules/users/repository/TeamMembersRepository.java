package pe.edu.pucp.hesperides.modules.users.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.entity.TeamMember;

import java.util.List;

public interface TeamMembersRepository extends JpaRepository<TeamMember, Long> {

    /** Cuadrillas vigentes de una persona: leftAt null y la fila no dada de baja. */
    @Query("SELECT tm.team FROM TeamMember tm "
            + "WHERE tm.userId = :userId AND tm.leftAt IS NULL AND tm.deletedAt IS NULL")
    List<Team> findActiveTeamsOfUser(@Param("userId") Long userId);

    /**
     * Miembros vigentes de un conjunto de cuadrillas. Con una lista vacia no
     * devuelve filas, que es lo correcto: un supervisor sin cuadrilla no debe
     * ver a nadie, no a todos.
     */
    @Query("SELECT tm.userId FROM TeamMember tm "
            + "WHERE tm.team.id IN :teamIds AND tm.leftAt IS NULL AND tm.deletedAt IS NULL")
    List<Long> findActiveUserIdsOfTeams(@Param("teamIds") List<Long> teamIds);
}
