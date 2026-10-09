package pe.edu.pucp.hesperides.modules.places.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.places.dto.OutlineRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceRequest;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceLookupRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceValues;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/**
 * Convierte una petición en los ids de la base y aplica las reglas del contorno:
 * un exterior se ubica por su contorno; un interior, por su padre.
 */
@Component
@RequiredArgsConstructor
class PlaceValuesResolver {

    private final PlaceLookupRepository lookup;
    private final PlaceRepository places;

    PlaceValues resolve(PlaceRequest request) {
        long kindId = lookup.catalogItemId(PlaceCatalogCodes.KIND, request.kindCode());
        long categoryId = lookup.catalogItemId(PlaceCatalogCodes.CATEGORY, request.categoryCode());
        Long parentId = blank(request.parentCode()) ? null : places.byCode(request.parentCode()).id();
        OutlineRequest outline = request.outline();
        checkOutline(request.kindCode(), outline, parentId);
        if (outline.geoJson() != null) {
            lookup.requireValidGeoJson(outline.geoJson());
        }
        return new PlaceValues(request.name().strip(), kindId, categoryId, parentId,
                outline.buildingId() == null ? null : lookup.buildingId(outline.buildingId()),
                blank(outline.zoneCode()) ? null : lookup.zoneId(outline.zoneCode()),
                blank(outline.featureCode()) ? null : lookup.featureId(outline.featureCode()),
                outline.geoJson());
    }

    private static void checkOutline(String kindCode, OutlineRequest outline, Long parentId) {
        if (outline.sourcesGiven() > 1) {
            throw new ValidationException("Give one outline source: a building, a zone, a feature or a drawing");
        }
        if (PlaceCatalogCodes.OUTDOOR.equals(kindCode) && outline.sourcesGiven() == 0) {
            throw new BusinessRuleException("An outdoor place needs an outline to be located on the map");
        }
        if (PlaceCatalogCodes.INDOOR.equals(kindCode) && outline.sourcesGiven() > 0) {
            throw new BusinessRuleException("An indoor place is located by its parent and has no outline of its own");
        }
        if (PlaceCatalogCodes.INDOOR.equals(kindCode) && parentId == null) {
            throw new BusinessRuleException("An indoor place must be inside another place");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
