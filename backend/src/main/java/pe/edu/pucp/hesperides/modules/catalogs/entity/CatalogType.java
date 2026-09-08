package pe.edu.pucp.hesperides.modules.catalogs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/** Agrupa los ítems de un catálogo configurable (SPEC-003). Creado por V001. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "catalog_types")
public class CatalogType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_system", nullable = false)
    private boolean system;
}