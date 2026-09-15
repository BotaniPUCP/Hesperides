package pe.edu.pucp.hesperides.modules.catalogs.dto;

import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogType;

/** Un tipo de catálogo sin sus ítems, para el listado de administración. */
public record CatalogTypeResponse(
        String code,
        String name,
        String description,
        boolean isSystem) {

    public static CatalogTypeResponse from(CatalogType type) {
        return new CatalogTypeResponse(
                type.getCode(), type.getName(), type.getDescription(), type.isSystem());
    }
}
