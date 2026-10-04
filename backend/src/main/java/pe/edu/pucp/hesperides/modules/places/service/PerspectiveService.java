package pe.edu.pucp.hesperides.modules.places.service;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.places.PerspectiveSide;
import pe.edu.pucp.hesperides.engine.places.PlaceThresholds;
import pe.edu.pucp.hesperides.modules.places.dto.PerspectiveRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.NearbyPerspective;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Perspective;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceRef;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceLookupRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceMapViewRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceMapViewRepository.Owner;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Perspectivas de un lugar exterior: un solo frente, una sola espalda y los lados que hagan falta. */
@Service
@RequiredArgsConstructor
public class PerspectiveService {

    private static final String ENTITY = "PlacePerspective";
    private static final long NEW_PERSPECTIVE = -1;

    private final PlaceRepository places;
    private final PerspectiveRepository perspectives;
    private final PlaceLookupRepository lookup;
    private final PerspectiveNaming naming;
    private final PlaceMapViewRepository views;
    private final PlaceDetailAssembler assembler;
    private final AuditService audit;

    @Transactional
    public Perspective create(String placeCode, PerspectiveRequest request) {
        PlaceRow place = outdoorPlace(placeCode);
        long sideId = sideId(place.id(), request.sideCode(), NEW_PERSPECTIVE);
        long id = perspectives.insert(place.id(), sideId, request.lat(), request.lon(), request.headingDeg());
        views.save(Owner.PERSPECTIVE, id, request.mapView());
        naming.rename(id);
        audit.record(AuditActionCode.PLACE_PERSPECTIVE_CREATED, ENTITY, id, Map.of("place", placeCode));
        return assembler.perspective(perspectives.byId(place.id(), id), List.of(), views.find(Owner.PERSPECTIVE, id));
    }

    @Transactional
    public Perspective update(String placeCode, long id, PerspectiveRequest request) {
        PlaceRow place = outdoorPlace(placeCode);
        perspectives.byId(place.id(), id);
        long sideId = sideId(place.id(), request.sideCode(), id);
        perspectives.move(id, sideId, request.lat(), request.lon(), request.headingDeg());
        if (request.mapView() != null) {
            views.save(Owner.PERSPECTIVE, id, request.mapView());
        }
        naming.rename(id);
        audit.record(AuditActionCode.PLACE_PERSPECTIVE_UPDATED, ENTITY, id, Map.of("place", placeCode));
        return assembler.perspective(perspectives.byId(place.id(), id), List.of(), views.find(Owner.PERSPECTIVE, id));
    }

    /** El nombre que el sistema le pondría, sin guardar nada: para verlo mientras se marca en el mapa. */
    @Transactional(readOnly = true)
    public String preview(String placeCode, PerspectiveRequest request) {
        PlaceRow place = outdoorPlace(placeCode);
        return naming.nameFor(place.id(), place.name(), place.parentName(), side(request.sideCode()), request.lat(),
                request.lon()).displayName();
    }

    @Transactional
    public void delete(String placeCode, long id) {
        PlaceRow place = places.byCode(placeCode);
        perspectives.byId(place.id(), id);
        perspectives.softDelete(id);
        audit.record(AuditActionCode.PLACE_PERSPECTIVE_DELETED, ENTITY, id, Map.of("place", placeCode));
    }

    @Transactional(readOnly = true)
    public List<NearbyPerspective> near(double lat, double lon) {
        return perspectives.near(lat, lon, PlaceThresholds.NEARBY_PERSPECTIVE_M).stream().map(p -> {
            PlaceRow place = places.byId(p.placeId());
            return new NearbyPerspective(p.id(), p.displayName(), new PlaceRef(place.code(), place.name()),
                    assembler.distanceM(lat, lon, p.lat(), p.lon()), assembler.firstThumbnail(place.id(), p.id()));
        }).toList();
    }

    private PlaceRow outdoorPlace(String code) {
        PlaceRow place = places.byCode(code);
        if (!PlaceCatalogCodes.OUTDOOR.equals(place.kindCode())) {
            throw new BusinessRuleException("Only outdoor places have perspectives; add photos to the indoor place instead");
        }
        return place;
    }

    private long sideId(long placeId, String sideCode, long exceptId) {
        PerspectiveSide side = side(sideCode);
        long sideId = lookup.catalogItemId(PlaceCatalogCodes.SIDE, sideCode);
        if (side.onePerPlace() && perspectives.countSide(placeId, sideId, exceptId) > 0) {
            throw new BusinessRuleException("The place already has a perspective of that side: edit it instead");
        }
        return sideId;
    }

    private static PerspectiveSide side(String sideCode) {
        try {
            return PerspectiveSide.valueOf(sideCode);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Unknown perspective side: " + sideCode);
        }
    }
}
