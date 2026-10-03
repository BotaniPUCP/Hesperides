package pe.edu.pucp.hesperides.modules.places.service;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.engine.places.CompassPoint;
import pe.edu.pucp.hesperides.engine.places.LandmarkCandidate;
import pe.edu.pucp.hesperides.engine.places.LandmarkPicker;
import pe.edu.pucp.hesperides.engine.places.PerspectiveName;
import pe.edu.pucp.hesperides.engine.places.PerspectiveSide;
import pe.edu.pucp.hesperides.engine.places.PlaceThresholds;
import pe.edu.pucp.hesperides.engine.proximity.LocalPlane;
import pe.edu.pucp.hesperides.engine.proximity.PlanarPoint;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository.ForNaming;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceGeometryRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceGeometryRepository.LatLon;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceTreeRepository;

/**
 * Pone y mantiene al día el nombre estándar de las perspectivas. Se llama dentro
 * de la transacción que cambia un lugar o una perspectiva, así que el nombre
 * nunca queda desfasado de lo que hay en el mapa.
 */
@Service
@RequiredArgsConstructor
public class PerspectiveNaming {

    private static final PlanarPoint CENTER = new PlanarPoint(0, 0);

    private final PerspectiveRepository perspectives;
    private final PlaceGeometryRepository geometry;
    private final PlaceTreeRepository tree;

    /** El nombre que tendría una perspectiva de ese lado en ese punto. */
    public record Naming(String compass, Long landmarkPlaceId, String displayName) {
    }

    public Naming nameFor(long placeId, String placeName, String parentName, PerspectiveSide side, double lat, double lon) {
        LatLon center = geometry.center(placeId);
        PlanarPoint point = new LocalPlane(center.lat(), center.lon()).toPlane(lat, lon);
        Optional<CompassPoint> compass = CompassPoint.from(CENTER, point);
        Optional<LandmarkCandidate> landmark = LandmarkPicker.pick(
                geometry.landmarkCandidates(lat, lon, PlaceThresholds.LANDMARK_MAX_M), tree.family(placeId));
        String name = PerspectiveName.of(side, placeName, parentName, compass.orElse(null),
                landmark.map(LandmarkCandidate::name).orElse(null));
        return new Naming(compass.map(Enum::name).orElse(null), landmark.map(LandmarkCandidate::placeId).orElse(null), name);
    }

    public void rename(long perspectiveId) {
        ForNaming p = perspectives.forNaming(perspectiveId);
        Naming n = nameFor(p.placeId(), p.placeName(), p.parentName(), PerspectiveSide.valueOf(p.sideCode()), p.lat(), p.lon());
        perspectives.saveNaming(perspectiveId, n.compass(), n.landmarkPlaceId(), n.displayName());
    }

    /** Tras crear, mover, renombrar o borrar un lugar: sus perspectivas y las de alrededor. */
    public void renameAround(long placeId) {
        geometry.perspectivesAffectedBy(placeId, PlaceThresholds.LANDMARK_MAX_M).forEach(this::rename);
    }
}
