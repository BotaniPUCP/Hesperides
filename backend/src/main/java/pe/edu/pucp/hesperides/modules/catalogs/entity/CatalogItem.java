package pe.edu.pucp.hesperides.modules.catalogs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.util.Map;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_item_id")
    private CatalogItem parentItem;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /**
     * Padre en catálogos de dos niveles (V008). Nulo en la inmensa mayoría: un
     * ROLE o un URGENCY_LEVEL es plano. Solo INTERVENTION_TYPE lo usa hoy, para
     * colgar cada tipo de su clase.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_item_id")
    private CatalogItem parentItem;

    /**
     * Datos que acompañan al ítem sin merecer una columna: la descripción de
     * ayuda que el operario lee en el formulario, el grupo responsable de una
     * clase, o el flag que marca los tipos aún no confirmados por el cliente.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;
}
