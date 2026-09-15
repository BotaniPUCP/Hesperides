package pe.edu.pucp.hesperides.modules.catalogs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.List;
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

    /**
     * Lo que consume un desplegable. Filtra por is_active para que un formulario
     * nuevo jamas ofrezca una opcion retirada, sin depender de que el cliente
     * filtre (SPEC-003 §6.2).
     */
    @Query("SELECT ci FROM CatalogItem ci LEFT JOIN FETCH ci.parentItem "
            + "WHERE ci.catalogType.code = :typeCode "
            + "AND ci.active = TRUE AND ci.deletedAt IS NULL "
            + "ORDER BY ci.sortOrder, ci.code")
    List<CatalogItem> findActiveByTypeCode(@Param("typeCode") String typeCode);

    /** La vista de administracion: incluye los inactivos para poder reactivarlos. */
    @Query("SELECT ci FROM CatalogItem ci LEFT JOIN FETCH ci.parentItem "
            + "WHERE ci.catalogType.code = :typeCode AND ci.deletedAt IS NULL "
            + "ORDER BY ci.sortOrder, ci.code")
    List<CatalogItem> findAllByTypeCode(@Param("typeCode") String typeCode);

    /**
     * Resuelve un item dentro de su tipo. Que el typeCode forme parte de la
     * consulta es lo que impide tratar un estado de incidencia como si fuera un
     * rol: un code solo es unico dentro de su catalogo (SPEC-003 §4).
     */
    @Query("SELECT ci FROM CatalogItem ci LEFT JOIN FETCH ci.parentItem "
            + "WHERE ci.catalogType.code = :typeCode AND ci.code = :code "
            + "AND ci.deletedAt IS NULL")
    Optional<CatalogItem> findByTypeCodeAndCode(@Param("typeCode") String typeCode,
                                                @Param("code") String code);

    /**
     * Resuelve un item por code sin conocer su tipo. Solo para encontrar al padre
     * de una jerarquia, donde el tipo del padre es distinto al del hijo y aun no
     * se conoce.
     */
    @Query("SELECT ci FROM CatalogItem ci JOIN FETCH ci.catalogType "
            + "WHERE ci.code = :code AND ci.deletedAt IS NULL")
    Optional<CatalogItem> findLiveByCode(@Param("code") String code);
}
