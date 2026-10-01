package pe.edu.pucp.hesperides.engine.proximity;

import java.util.List;

/**
 * Nombre con que se describe un edificio: el suyo; si no tiene, el de la
 * referencia más cercana dentro del umbral; si tampoco, «Edificio sin nombre,
 * junto a» el edificio con nombre más cercano (SPEC-102 D-04).
 *
 * «Más cercano» se mide desde el punto del edificio sin nombre más próximo al
 * que se describe, como el prototipo: en un edificio largo, cada extremo se
 * describe por su propio vecino. Y un vecino nombrado por una referencia cuenta
 * como nombrado.
 */
final class BuildingNamer {

    static final String UNNAMED = "Edificio sin nombre";

    private BuildingNamer() {
    }

    static String nameOf(BuildingCandidate building, PlanarPoint anchor, List<BuildingCandidate> buildings,
                         List<NamedPoint> places, double nameThresholdM) {
        String own = ownName(building, places, nameThresholdM);
        if (own != null) {
            return own;
        }
        String neighbour = nearestNamedNeighbour(building, anchor, buildings, places, nameThresholdM);
        return neighbour == null ? UNNAMED : UNNAMED + ", junto a " + neighbour;
    }

    private static String ownName(BuildingCandidate building, List<NamedPoint> places, double limit) {
        return building.name() != null ? building.name() : nearestPlaceName(building, places, limit);
    }

    private static String nearestPlaceName(BuildingCandidate building, List<NamedPoint> places, double limit) {
        String best = null;
        double bestDistance = limit;
        for (NamedPoint place : places) {
            double d = PlanarGeometry.distance(building.footprint(), place.point());
            if (d <= bestDistance) {
                bestDistance = d;
                best = place.name();
            }
        }
        return best;
    }

    private static String nearestNamedNeighbour(BuildingCandidate from, PlanarPoint anchor,
                                                List<BuildingCandidate> buildings, List<NamedPoint> places,
                                                double limit) {
        String best = null;
        long bestId = Long.MAX_VALUE;
        double bestDistance = Double.POSITIVE_INFINITY;
        for (BuildingCandidate other : buildings) {
            if (other.id() == from.id()) {
                continue;
            }
            double d = PlanarGeometry.distance(other.footprint(), anchor);
            if (d > bestDistance || (d == bestDistance && other.id() > bestId)) {
                continue;
            }
            String name = ownName(other, places, limit);
            if (name != null) {
                best = name;
                bestId = other.id();
                bestDistance = d;
            }
        }
        return best;
    }
}
