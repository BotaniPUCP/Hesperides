package pe.edu.pucp.hesperides.modules.catalogs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogType;

import java.util.Optional;

public interface CatalogTypesRepository extends JpaRepository<CatalogType, Long> {

    Optional<CatalogType> findByCodeAndDeletedAtIsNull(String code);

    boolean existsByCodeAndDeletedAtIsNull(String code);
}