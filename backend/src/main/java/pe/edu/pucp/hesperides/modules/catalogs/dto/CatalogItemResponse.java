package pe.edu.pucp.hesperides.modules.catalogs.dto;

import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.Map;

/**
 * Un ítem tal como lo ve la API. Sin el id numérico a propósito (SPEC-003 §4):
 * si mañana se resiembran los catálogos los id cambian y el code no, así que el
 * code es la única referencia estable que el frontend puede guardar.
 */
public record CatalogItemResponse(
        String code,
        String label,
        int sortOrder,
        boolean isActive,
        String parentCode,
        Map<String, Object> metadata) {

    public static CatalogItemResponse from(CatalogItem item) {
        return new CatalogItemResponse(
                item.getCode(),
                item.getLabel(),
                item.getSortOrder(),
                item.isActive(),
                item.getParentItem() == null ? null : item.getParentItem().getCode(),
                item.getMetadata());
    }
}
