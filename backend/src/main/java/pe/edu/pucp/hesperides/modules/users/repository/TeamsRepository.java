package pe.edu.pucp.hesperides.modules.users.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

public interface TeamsRepository extends JpaRepository<Team, Long> {
    java.util.List<Team> findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNullOrderByNameAsc(Long userId);
    java.util.List<Team> findByActiveTrueAndDeletedAtIsNullOrderByNameAsc();
}
