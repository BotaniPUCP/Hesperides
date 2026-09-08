package pe.edu.pucp.hesperides.modules.auth.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.Collection;
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

    /**
     * Resolución del actor para la auditoría (SPEC-004 §5.2): no filtra por
     * deleted_at porque una cuenta dada de baja después de actuar debe seguir
     * resolviendo a su id en audit_log.
     */
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("SELECT COUNT(u) FROM User u WHERE u.roleItem.code = 'ADMIN' "
            + "AND u.active = TRUE AND u.deletedAt IS NULL AND u.id <> :excludedId")
    long countOtherActiveAdmins(@Param("excludedId") Long excludedId);

    Optional<User> findByIdAndDeletedAtIsNull(Long id);

    /**
     * Listado paginado de SPEC-100 §3.2. Por defecto el servicio fuerza
     * isActive=true; el resto de filtros son opcionales y en AND. La búsqueda
     * es insensible a mayúsculas y tildes vía unaccent (Postgres contrib),
     * habilitada por V101: el patron llega ya plegado (sin acentos, en
     * minúsculas) con los comodines % incluidos.
     *
     * @param scope restringe la consulta al alcance del actor: null para
     *              ADMIN/COORDINADOR, el conjunto de ids de su cuadrilla para
     *              un SUPERVISOR.
     */
    @Query("""
            SELECT u FROM User u
            WHERE u.deletedAt IS NULL
              AND u.active = :isActive
              AND (:roleCode IS NULL OR u.roleItem.code = :roleCode)
              AND (:teamId IS NULL OR EXISTS (
                      SELECT tm FROM TeamMember tm
                      WHERE tm.user.id = u.id AND tm.team.id = :teamId AND tm.leftAt IS NULL))
              AND (:scope IS NULL OR u.id IN :scope)
              AND (:folded IS NULL
                   OR LOWER(CAST(unaccent(u.firstName) AS string)) LIKE :folded
                   OR LOWER(CAST(unaccent(u.lastName) AS string)) LIKE :folded
                   OR LOWER(CAST(unaccent(u.email) AS string)) LIKE :folded)
            """)
    Page<User> searchUsers(
            @Param("isActive") boolean isActive,
            @Param("roleCode") String roleCode,
            @Param("teamId") Long teamId,
            @Param("scope") Collection<Long> scope,
            @Param("folded") String folded,
            Pageable pageable);
}