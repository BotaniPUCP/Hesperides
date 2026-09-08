package pe.edu.pucp.hesperides.modules.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.auth.entity.RefreshToken;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokensRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Revocación masiva: la usa el logout, la desactivación de un usuario y la
     * detección de reuso de un token rotado.
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :now "
            + "WHERE rt.user.id = :userId AND rt.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") Long userId, @Param("now") Instant now);

    /**
     * Cambiar la propia contraseña revoca todas las sesiones menos la actual
     * (SPEC-100 CA-11). No conocemos el id del token en uso, pero el token de
     * la sesión en curso es el más reciente emitido para el usuario: se
     * revoca todo lo que no sea el de id máximo. Si no quedan vigentes, el
     * MAX es NULL y la comparación no afecta a ninguna fila.
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :now "
            + "WHERE rt.user.id = :userId AND rt.revokedAt IS NULL "
            + "AND rt.id <> (SELECT MAX(r2.id) FROM RefreshToken r2 "
            + "              WHERE r2.user.id = :userId AND r2.revokedAt IS NULL)")
    int revokeAllExceptLatest(@Param("userId") Long userId, @Param("now") Instant now);
}