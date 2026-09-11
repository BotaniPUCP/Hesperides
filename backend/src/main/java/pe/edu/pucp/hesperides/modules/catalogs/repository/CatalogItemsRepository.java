package pe.edu.pucp.hesperides.modules.catalogs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.Optional;

public interface CatalogItemsRepository extends JpaRepository<CatalogItem, Long> {

    /**
     * Resuelve un rol por su code. Exige is_active porque un rol desactivado no
     * debe poder asignarse a nadie nuevo, aunque las cuentas que ya lo tengan lo
     * conserven (SPEC-003 §7.1).
     */
    @Query("SELECT ci FROM CatalogItem ci "
            + "WHERE ci.catalogType.code = 'ROLE' AND ci.code = :code "
            + "AND ci.active = TRUE AND ci.deletedAt IS NULL")
    Optional<CatalogItem> findActiveRoleByCode(@Param("code") String code);
}
