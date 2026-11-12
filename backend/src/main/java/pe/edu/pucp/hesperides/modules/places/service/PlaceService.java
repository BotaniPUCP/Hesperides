package pe.edu.pucp.hesperides.modules.places.service;

import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.places.HierarchyViolation;
import pe.edu.pucp.hesperides.engine.places.PlaceHierarchy;
import pe.edu.pucp.hesperides.engine.places.PlaceThresholds;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceRequest;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceBuildingRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceValues;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceTreeRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;

/** Altas, cambios y bajas de lugares, con las reglas del árbol y del contorno. */
@Service
@RequiredArgsConstructor
public class PlaceService {

    private static final String ENTITY = "Place";

    private final PlaceRepository places;
    private final PlaceBuildingRepository buildings;
    private final PlaceTreeRepository tree;
    private final PerspectiveRepository perspectives;
    private final PlaceValuesResolver resolver;
    private final PerspectiveNaming naming;
    private final AuditService audit;

    @Transactional
    public String create(PlaceRequest request) {
        PlaceValues values = resolver.resolve(request, null);
        checkHierarchy(null, values.parentId());
        long id = saveUnique(() -> places.insert(values), request.name());
        buildings.replace(id, values.buildingIds());
        places.replaceAliases(id, request.aliasesOrEmpty());
        naming.renameAround(id);
        renameAroundParent(values.parentId());
        audit.record(AuditActionCode.PLACE_CREATED, ENTITY, id, Map.of("name", request.name()));
        return places.byId(id).code();
    }

    @Transactional
    public void update(String code, PlaceRequest request) {
        PlaceRow current = places.byCode(code);
        PlaceValues values = resolver.resolve(request, current.id());
        checkHierarchy(current.id(), values.parentId());
        if (PlaceCatalogCodes.INDOOR.equals(request.kindCode()) && !perspectives.byPlace(current.id()).isEmpty()) {
            throw new BusinessRuleException("Delete the perspectives before turning the place into an indoor one");
        }
        // Antes y después: las que lo tenían de hito cerca del contorno viejo también cambian.
        naming.renameAround(current.id());
        saveUnique(() -> {
            places.update(current.id(), values);
            return current.id();
        }, request.name());
        buildings.replace(current.id(), values.buildingIds());
        places.replaceAliases(current.id(), request.aliasesOrEmpty());
        naming.renameAround(current.id());
        renameAroundParent(current.parentId());
        renameAroundParent(values.parentId());
        audit.record(AuditActionCode.PLACE_UPDATED, ENTITY, current.id(), Map.of("name", request.name()));
    }

    @Transactional
    public void delete(String code) {
        PlaceRow place = places.byCode(code);
        if (places.activeChildren(place.id()) > 0) {
            throw new ConflictException("The place has places inside it: move or delete them first");
        }
        places.softDelete(place.id());
        naming.renameAround(place.id());
        renameAroundParent(place.parentId());
        audit.record(AuditActionCode.PLACE_DELETED, ENTITY, place.id(), Map.of("name", place.name()));
    }

    /** Un complejo toma su contorno de sus hijos: si uno cambia, el centro del complejo también. */
    private void renameAroundParent(Long parentId) {
        if (parentId != null) {
            naming.renameAround(parentId);
        }
    }

    private void checkHierarchy(Long placeId, Long parentId) {
        if (parentId == null) {
            return;
        }
        List<Long> chain = tree.selfAndAncestors(parentId);
        int height = placeId == null ? 1 : tree.subtreeHeight(placeId);
        PlaceHierarchy.check(placeId, chain, height).ifPresent(violation -> {
            throw new BusinessRuleException(violation == HierarchyViolation.CYCLE
                    ? "A place cannot be inside one of its own places"
                    : "Places can be nested at most " + PlaceThresholds.MAX_DEPTH + " levels deep");
        });
    }

    private long saveUnique(LongSupplier save, String name) {
        try {
            return save.getAsLong();
        } catch (DuplicateKeyException e) {
            throw new DuplicateResourceException("There is already a place named «" + name + "» there");
        }
    }
}
