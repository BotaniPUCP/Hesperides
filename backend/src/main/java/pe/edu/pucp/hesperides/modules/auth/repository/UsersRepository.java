package pe.edu.pucp.hesperides.modules.auth.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.List;
import java.util.Optional;

public interface UsersRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

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

    /**
     * Los demás administradores activos, **tomando un bloqueo** sobre las filas.
     * El bloqueo no es una precaución teórica: sin él, dos administradores
     * desactivándose en el mismo instante leerían ambos "hay otro", ambos
     * procederían, y el sistema quedaría sin ninguno (SPEC-100 §5.6).
     *
     * Devuelve ids y no un COUNT porque JPQL no admite bloqueo sobre una función
     * de agregación. El conjunto es de unidades, así que contar en memoria no
     * tiene coste.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u.id FROM User u WHERE u.roleItem.code = 'ADMIN' "
            + "AND u.active = TRUE AND u.deletedAt IS NULL AND u.id <> :excludedId")
    List<Long> findOtherActiveAdminIdsForUpdate(@Param("excludedId") Long excludedId);

    /** Correo único entre vigentes, excluyendo a un usuario (lo usa el PUT). */
    @Query("SELECT COUNT(u) FROM User u "
            + "WHERE u.email = :email AND u.deletedAt IS NULL AND u.id <> :excludedId")
    long countByEmailExcluding(@Param("email") String email, @Param("excludedId") Long excludedId);
}
