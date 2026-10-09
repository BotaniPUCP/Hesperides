package pe.edu.pucp.hesperides.modules.places.service;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.MapView;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceMapViewRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;

/** Guarda o quita el encuadre con que el mapa muestra un lugar. */
@Service
@RequiredArgsConstructor
public class PlaceMapViewService {

    private final PlaceRepository places;
    private final PlaceMapViewRepository views;
    private final AuditService audit;

    /** {@code view} null vuelve al encuadre automático. */
    @Transactional
    public void save(String code, MapView view) {
        PlaceRow place = places.byCode(code);
        views.save(place.id(), view);
        audit.record(AuditActionCode.PLACE_UPDATED, "Place", place.id(), Map.of("mapView", view == null ? "automatic" : "saved"));
    }
}
