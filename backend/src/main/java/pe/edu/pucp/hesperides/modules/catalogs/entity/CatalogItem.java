package pe.edu.pucp.hesperides.modules.catalogs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Un valor concreto de un catálogo: un rol, un estado, un tipo. Sustituye a
 * los enum de dominio para que el cliente pueda ampliarlos sin desplegar
 * código (SPEC-003).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "catalog_items")
public class CatalogItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "catalog_type_id", nullable = false)
    private CatalogType catalogType;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}