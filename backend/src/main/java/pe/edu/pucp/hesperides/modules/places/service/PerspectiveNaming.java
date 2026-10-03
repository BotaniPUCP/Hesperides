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

    public void rename(long perspectiveId) {
        ForNaming p = perspectives.forNaming(perspectiveId);
        LatLon center = geometry.center(p.placeId());
        PlanarPoint point = new LocalPlane(center.lat(), center.lon()).toPlane(p.lat(), p.lon());
        Optional<CompassPoint> compass = CompassPoint.from(CENTER, point);
        Optional<LandmarkCandidate> landmark = LandmarkPicker.pick(
                geometry.landmarkCandidates(p.lat(), p.lon(), PlaceThresholds.LANDMARK_MAX_M), tree.family(p.placeId()));
        String name = PerspectiveName.of(PerspectiveSide.valueOf(p.sideCode()), p.placeName(), p.parentName(),
                compass.orElse(null), landmark.map(LandmarkCandidate::name).orElse(null));
        perspectives.saveNaming(perspectiveId, compass.map(Enum::name).orElse(null),
                landmark.map(LandmarkCandidate::placeId).orElse(null), name);
    }

    /** Tras crear, mover, renombrar o borrar un lugar: sus perspectivas y las de alrededor. */
    public void renameAround(long placeId) {
        geometry.perspectivesAffectedBy(placeId, PlaceThresholds.LANDMARK_MAX_M).forEach(this::rename);
    }
}
