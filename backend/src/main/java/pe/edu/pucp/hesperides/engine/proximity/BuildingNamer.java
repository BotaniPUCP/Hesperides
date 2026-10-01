package pe.edu.pucp.hesperides.engine.proximity;

import java.util.List;

/**
 * Nombre con que se describe un edificio: el suyo; si no tiene, el de la
 * referencia más cercana dentro del umbral; si tampoco, «Edificio sin nombre,
 * junto a» el edificio con nombre más cercano (SPEC-102 D-04).
 */
final class BuildingNamer {

    static final String UNNAMED = "Edificio sin nombre";

    private BuildingNamer() {
    }

    static String nameOf(BuildingCandidate building, List<BuildingCandidate> buildings,
                         List<NamedPoint> places, double nameThresholdM) {
        if (building.name() != null) {
            return building.name();
        }
        String fromPlace = nearestPlaceName(building, places, nameThresholdM);
        if (fromPlace != null) {
            return fromPlace;
        }
        BuildingCandidate named = nearestNamedBuilding(building, buildings);
        return named == null ? UNNAMED : UNNAMED + ", junto a " + named.name();
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

    private static BuildingCandidate nearestNamedBuilding(BuildingCandidate from, List<BuildingCandidate> buildings) {
        BuildingCandidate best = null;
        double bestGap = Double.POSITIVE_INFINITY;
        for (BuildingCandidate other : buildings) {
            if (other.name() == null || other.id() == from.id()) {
                continue;
            }
            double gap = PlanarGeometry.gap(from.footprint(), other.footprint());
            if (best == null || gap < bestGap || (gap == bestGap && other.id() < best.id())) {
                bestGap = gap;
                best = other;
            }
        }
        return best;
    }
}
