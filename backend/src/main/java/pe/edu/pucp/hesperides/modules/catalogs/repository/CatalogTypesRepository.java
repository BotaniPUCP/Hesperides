package pe.edu.pucp.hesperides.modules.catalogs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogType;

import java.util.List;
import java.util.Optional;

public interface CatalogTypesRepository extends JpaRepository<CatalogType, Long> {

    @Query("SELECT ct FROM CatalogType ct WHERE ct.code = :code AND ct.deletedAt IS NULL")
    Optional<CatalogType> findByCode(String code);

    @Query("SELECT ct FROM CatalogType ct WHERE ct.deletedAt IS NULL ORDER BY ct.code")
    List<CatalogType> findAllLive();
}
