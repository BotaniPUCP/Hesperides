package pe.edu.pucp.hesperides.engine.places;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Elige el lugar que da el «hacia …» de una perspectiva: el más cercano. El
 * propio lugar, sus padres y sus hijos no cuentan: «al lado de Cancha 1, hacia
 * Polideportivo» no ubica a nadie.
 */
public final class LandmarkPicker {

    private static final Comparator<LandmarkCandidate> NEAREST_THEN_NAME =
            Comparator.comparingDouble(LandmarkCandidate::distanceM).thenComparing(LandmarkCandidate::name);

    private LandmarkPicker() {
    }

    public static Optional<LandmarkCandidate> pick(List<LandmarkCandidate> candidates, Set<Long> excludedPlaceIds) {
        return candidates.stream()
                .filter(c -> !excludedPlaceIds.contains(c.placeId()))
                .filter(c -> c.distanceM() <= PlaceThresholds.LANDMARK_MAX_M)
                .min(NEAREST_THEN_NAME);
    }
}
