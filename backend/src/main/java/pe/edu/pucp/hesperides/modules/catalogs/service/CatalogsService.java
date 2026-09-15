package pe.edu.pucp.hesperides.modules.catalogs.service;

import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogItemResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogTypeDetailResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogTypeResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CreateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.dto.UpdateCatalogItemRequest;

import java.util.List;

public interface CatalogsService {

    /** Ítems activos de un tipo, ordenados. Lo que consume useCatalog. */
    List<CatalogItemResponse> activeItems(String typeCode);

    List<CatalogTypeResponse> allTypes();

    /** El tipo con todos sus ítems, activos o no. */
    CatalogTypeDetailResponse typeDetail(String typeCode);

    CatalogItemResponse createItem(String typeCode, CreateCatalogItemRequest request);

    CatalogItemResponse updateItem(String typeCode, String code, UpdateCatalogItemRequest request);

    CatalogItemResponse deactivateItem(String typeCode, String code);

    CatalogItemResponse activateItem(String typeCode, String code);
}
