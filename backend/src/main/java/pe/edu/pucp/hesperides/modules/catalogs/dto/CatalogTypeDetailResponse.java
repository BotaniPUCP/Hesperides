package pe.edu.pucp.hesperides.modules.catalogs.dto;

import java.util.List;

/** El tipo con todos sus ítems, activos o no: la vista de administración. */
public record CatalogTypeDetailResponse(
        String code,
        String name,
        String description,
        boolean isSystem,
        List<CatalogItemResponse> items) {
}
