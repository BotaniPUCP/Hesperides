package pe.edu.pucp.hesperides.modules.catalogs.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogItemResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogTypeDetailResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogTypeResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CreateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.dto.UpdateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogType;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogTypesRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;

/**
 * Valida, delega y devuelve. La única regla de negocio propia es la protección
 * de ítems de sistema, que vive en ProtectedCatalogItems.
 */
@Service
@RequiredArgsConstructor
public class CatalogsServiceImpl implements CatalogsService {

    private static final String SYSTEM_ITEM =
            "Este ítem es requerido por el sistema y no puede desactivarse";

    private final CatalogTypesRepository typesRepository;
    private final CatalogItemsRepository itemsRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CatalogItemResponse> activeItems(String typeCode) {
        requireType(typeCode);
        return itemsRepository.findActiveByTypeCode(typeCode).stream()
                .map(CatalogItemResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CatalogTypeResponse> allTypes() {
        return typesRepository.findAllLive().stream().map(CatalogTypeResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CatalogTypeDetailResponse typeDetail(String typeCode) {
        CatalogType type = requireType(typeCode);
        List<CatalogItemResponse> items = itemsRepository.findAllByTypeCode(typeCode).stream()
                .map(CatalogItemResponse::from)
                .toList();

        return new CatalogTypeDetailResponse(
                type.getCode(), type.getName(), type.getDescription(), type.isSystem(), items);
    }

    @Override
    @Transactional
    public CatalogItemResponse createItem(String typeCode, CreateCatalogItemRequest request) {
        CatalogType type = requireType(typeCode);

        itemsRepository.findByTypeCodeAndCode(typeCode, request.code()).ifPresent(existing -> {
            throw new DuplicateResourceException(
                    "Ya existe un ítem con el código " + request.code() + " en " + typeCode);
        });

        CatalogItem item = new CatalogItem();
        item.setCatalogType(type);
        item.setCode(request.code());
        item.setLabel(request.label());
        item.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        item.setMetadata(request.metadata());
        item.setActive(true);

        if (request.parentCode() != null) {
            item.setParentItem(requireParent(typeCode, request.parentCode()));
        }

        return CatalogItemResponse.from(itemsRepository.save(item));
    }

    @Override
    @Transactional
    public CatalogItemResponse updateItem(String typeCode, String code, UpdateCatalogItemRequest request) {
        CatalogItem item = requireItem(typeCode, code);

        // El code no se toca: lo referencian otras tablas y el backend decide por él.
        item.setLabel(request.label());
        if (request.sortOrder() != null) {
            item.setSortOrder(request.sortOrder());
        }
        if (request.metadata() != null) {
            item.setMetadata(request.metadata());
        }

        return CatalogItemResponse.from(itemsRepository.save(item));
    }

    @Override
    @Transactional
    public CatalogItemResponse deactivateItem(String typeCode, String code) {
        CatalogItem item = requireItem(typeCode, code);

        if (ProtectedCatalogItems.covers(item)) {
            throw new BusinessRuleException(SYSTEM_ITEM);
        }

        // Idempotente: desactivar lo ya desactivado no es un error ni una escritura.
        if (!item.isActive()) {
            return CatalogItemResponse.from(item);
        }

        item.setActive(false);
        return CatalogItemResponse.from(itemsRepository.save(item));
    }

    @Override
    @Transactional
    public CatalogItemResponse activateItem(String typeCode, String code) {
        CatalogItem item = requireItem(typeCode, code);

        if (item.isActive()) {
            return CatalogItemResponse.from(item);
        }

        item.setActive(true);
        return CatalogItemResponse.from(itemsRepository.save(item));
    }

    private CatalogType requireType(String typeCode) {
        return typesRepository.findByCode(typeCode)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el catálogo " + typeCode));
    }

    /**
     * El typeCode va en la búsqueda: un ítem solo se resuelve dentro de su propio
     * catálogo, nunca por code suelto. Sin eso, una FK aceptaría un estado de
     * incidencia como si fuera un rol.
     */
    private CatalogItem requireItem(String typeCode, String code) {
        requireType(typeCode);
        return itemsRepository.findByTypeCodeAndCode(typeCode, code)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe el ítem " + code + " en el catálogo " + typeCode));
    }

    /**
     * El padre pertenece a otro catalog_type, y eso es justamente lo que hace
     * válida la jerarquía: INTERVENTION_CLASS -> INTERVENTION_TYPE. Un padre del
     * mismo tipo sería un tercer nivel encubierto, que la base no puede impedir
     * con un CHECK (V008).
     */
    private CatalogItem requireParent(String typeCode, String parentCode) {
        CatalogItem parent = itemsRepository.findLiveByCode(parentCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe el ítem padre " + parentCode));

        if (parent.getCatalogType().getCode().equals(typeCode)) {
            throw new BusinessRuleException(
                    "El padre debe pertenecer a un catálogo distinto: la jerarquía es de dos niveles");
        }
        return parent;
    }
}
