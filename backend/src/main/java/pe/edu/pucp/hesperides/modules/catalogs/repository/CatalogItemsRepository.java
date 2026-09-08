package pe.edu.pucp.hesperides.modules.catalogs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.List;
import java.util.Optional;

public interface CatalogItemsRepository extends JpaRepository<CatalogItem, Long> {

    /**
     * Resuelve el roleCode de un request a su CatalogItem (SPEC-100 §3.2).
     * Los roles viven en catalog_items tipo ROLE: nunca un enum en Java.
     * Se exige activo y vigente; si no, el alta de usuarios responde 422.
     */
    @Query("SELECT ci FROM CatalogItem ci "
            + "WHERE ci.catalogType.code = 'ROLE' AND ci.code = :code "
            + "AND ci.active = TRUE AND ci.deletedAt IS NULL")
    Optional<CatalogItem> findActiveRoleByCode(@Param("code") String code);

    /**
     * Lista los ítems vigentes de un catálogo configurable, en el orden del
     * administrador (SPEC-003). Lo consume el frontend para poblar selects
     * como el de rol en el alta de usuarios (SPEC-100 §5.1, useCatalog('ROLE')).
     */
    @Query("SELECT ci FROM CatalogItem ci "
            + "WHERE ci.catalogType.code = :typeCode AND ci.active = TRUE AND ci.deletedAt IS NULL "
            + "ORDER BY ci.sortOrder ASC")
    List<CatalogItem> findActiveByTypeCode(@Param("typeCode") String typeCode);

    /**
     * Ítems vigentes de un tipo (incluidos inactivos) para el ADMIN con
     * includeInactive=true (SPEC-003 §4).
     */
    @Query("SELECT ci FROM CatalogItem ci "
            + "WHERE ci.catalogType.code = :typeCode AND ci.deletedAt IS NULL "
            + "ORDER BY ci.sortOrder ASC")
    List<CatalogItem> findByCatalogTypeCodeAndDeletedAtIsNullOrderBySortOrderAsc(@Param("typeCode") String typeCode);
}