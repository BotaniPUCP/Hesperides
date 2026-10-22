package pe.edu.pucp.hesperides.modules.places.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveOrderRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

/** Reordena las perspectivas de un lugar: el orden en que se recorren, en la lista y en el carrusel. */
@Service
@RequiredArgsConstructor
public class PerspectiveOrderService {

    private final PlaceRepository places;
    private final PerspectiveOrderRepository order;
    private final AuditService audit;

    /**
     * El orden nuevo debe nombrar cada perspectiva vigente del lugar una sola vez:
     * si falta o sobra alguna, otra persona la cambió mientras tanto y aplicarlo
     * dejaría el orden a medias.
     */
    @Transactional
    public void reorder(String placeCode, List<Long> ids) {
        PlaceRow place = places.byCode(placeCode);
        if (new HashSet<>(ids).size() != ids.size() || !new HashSet<>(ids).equals(order.activeIds(place.id()))) {
            throw new BusinessRuleException("The new order must list every perspective of the place exactly once; reload and try again");
        }
        order.reorder(place.id(), ids);
        audit.record(AuditActionCode.PLACE_UPDATED, "Place", place.id(), Map.of("perspectiveOrder", ids));
    }
}
