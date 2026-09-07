package pe.edu.pucp.hesperides.modules.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.Optional;

public interface UsersRepository extends JpaRepository<User, Long> {

    /**
     * Busca entre las cuentas vigentes (no dadas de baja lógica). No filtra
     * por is_active a propósito: el servicio de login necesita distinguir
     * "no existe" de "existe pero está desactivada" para decidir qué hacer,
     * aunque el mensaje que devuelva al cliente sea el mismo.
     */
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findActiveByEmail(@Param("email") String email);

    @Query("SELECT COUNT(u) FROM User u WHERE u.roleItem.code = 'ADMIN' "
            + "AND u.active = TRUE AND u.deletedAt IS NULL AND u.id <> :excludedId")
    long countOtherActiveAdmins(@Param("excludedId") Long excludedId);
}
