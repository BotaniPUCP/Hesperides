package pe.edu.pucp.hesperides.engine.duplicates;

import pe.edu.pucp.hesperides.engine.proximity.LocalPlane;
import pe.edu.pucp.hesperides.engine.proximity.PlanarPoint;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ¿Ya está registrado? (SPEC-103 D-05). Dos plantas de la misma especie más
 * cerca que la separación mínima real entre plantas de su tipo son,
 * probablemente, la misma registrada dos veces. El umbral depende del tipo:
 * dos palmeras no crecen a 80 cm, dos arbustos sí.
 */
public final class DuplicateDetector {

    /** Metros, por código de SPECIES_TYPE. Se muestran como parámetros restringidos. */
    public static final Map<String, Double> THRESHOLDS_M = Map.of(
            "TREE", 1.5,
            "PALM", 1.0,
            "SHRUB", 0.5, "HEDGE", 0.5, "CLIMBER", 0.5,
            "HERB", 0.3, "SUCCULENT", 0.3, "GROUNDCOVER", 0.3, "POTTED_HERB", 0.3);

    /** Tachos y bebederos: sin especie, un metro. */
    public static final double FEATURE_THRESHOLD_M = 1.0;

    private DuplicateDetector() {
    }

    /** Un tipo nuevo sin umbral es un descuido del catálogo: se falla en vez de adivinar. */
    public static double thresholdFor(String vegetationType) {
        Double threshold = THRESHOLDS_M.get(vegetationType);
        if (threshold == null) {
            throw new IllegalArgumentException("Sin umbral de duplicado para el tipo " + vegetationType);
        }
        return threshold;
    }

    public static Optional<DuplicateMatch> find(double lat, double lon, String speciesKey, String vegetationType,
                                                List<Nearby> registered) {
        double threshold = thresholdFor(vegetationType);
        return closest(lat, lon, registered.stream().filter(n -> speciesKey.equals(n.speciesKey())).toList(), threshold);
    }

    public static Optional<DuplicateMatch> findFeature(double lat, double lon, List<Nearby> registered) {
        return closest(lat, lon, registered, FEATURE_THRESHOLD_M);
    }

    private static Optional<DuplicateMatch> closest(double lat, double lon, List<Nearby> candidates, double threshold) {
        LocalPlane plane = new LocalPlane(lat, lon);
        return candidates.stream()
                .map(n -> new DuplicateMatch(n.code(), distance(plane.toPlane(n.lat(), n.lon()))))
                .filter(m -> m.distanceM() < threshold)
                .min(Comparator.comparingDouble(DuplicateMatch::distanceM).thenComparing(DuplicateMatch::code));
    }

    private static double distance(PlanarPoint p) {
        return Math.hypot(p.x(), p.y());
    }
}
