package pe.edu.pucp.hesperides.modules.places.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.places.dto.OutlineRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceRequest;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceBuildingRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceLookupRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceValues;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
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
    private final PlaceBuildingRepository buildings;

    /** {@code placeId}: el lugar que se edita, que puede conservar sus propios edificios; null en un alta. */
    PlaceValues resolve(PlaceRequest request, Long placeId) {
        long kindId = lookup.catalogItemId(PlaceCatalogCodes.KIND, request.kindCode());
        long categoryId = lookup.catalogItemId(PlaceCatalogCodes.CATEGORY, request.categoryCode());
        Long parentId = blank(request.parentCode()) ? null : places.byCode(request.parentCode()).id();
        OutlineRequest outline = request.outline();
        checkOutline(request.kindCode(), outline, parentId);
        if (outline.geoJson() != null) {
            lookup.requireValidGeoJson(outline.geoJson());
        }
        return new PlaceValues(request.name().strip(), kindId, categoryId, parentId, freeBuildings(outline, placeId),
                blank(outline.zoneCode()) ? null : lookup.zoneId(outline.zoneCode()),
                blank(outline.featureCode()) ? null : lookup.featureId(outline.featureCode()),
                outline.geoJson(), outline.takesChildren());
    }

    /** Un edificio es de un solo lugar: si no, al pulsarlo en el mapa no se sabría cuál abrir. */
    private List<Long> freeBuildings(OutlineRequest outline, Long placeId) {
        List<Long> ids = outline.buildingIdsOrEmpty().stream().map(lookup::buildingId).toList();
        buildings.firstTaken(ids, placeId).ifPresent(owner -> {
            throw new ConflictException("Building " + owner.buildingId() + " already belongs to «"
                    + owner.placeName() + "» (" + owner.placeCode() + ")");
        });
        return ids;
    }

    private static void checkOutline(String kindCode, OutlineRequest outline, Long parentId) {
        if (outline.sourcesGiven() > 1) {
            throw new ValidationException(
                    "Give one outline source: buildings, a zone, a feature, a drawing or the places inside it");
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
