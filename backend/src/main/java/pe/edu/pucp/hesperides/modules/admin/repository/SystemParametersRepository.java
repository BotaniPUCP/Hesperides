package pe.edu.pucp.hesperides.modules.admin.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.admin.entity.SystemParameter;

import java.util.List;
import java.util.Optional;

public interface SystemParametersRepository extends JpaRepository<SystemParameter, Long> {

    @Query("SELECT sp FROM SystemParameter sp "
            + "WHERE sp.code = :code AND sp.deletedAt IS NULL")
    Optional<SystemParameter> findByCode(@Param("code") String code);

    @Query("SELECT sp FROM SystemParameter sp WHERE sp.deletedAt IS NULL ORDER BY sp.code")
    List<SystemParameter> findAllLive();
}