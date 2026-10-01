package pe.edu.pucp.hesperides.engine.proximity;

import java.util.List;

/**
 * Describe dónde está un punto del campus (SPEC-102 D-04). Prioridad:
 * <ol>
 *   <li>el edificio que contiene el punto;</li>
 *   <li>el edificio contiguo a la sección que contiene el punto (el más cercano
 *       al punto si hay varios);</li>
 *   <li>el edificio más cercano.</li>
 * </ol>
 * Los empates se resuelven por menor id, para que la misma entrada dé siempre
 * la misma descripción.
 */
public final class ProximityLocator {

    private ProximityLocator() {
    }

    public static LocationDescription describe(PlanarPoint point, List<SectionCandidate> sections,
                                               List<BuildingCandidate> buildings, List<NamedPoint> places,
                                               ProximityThresholds thresholds) {
        SectionCandidate section = sectionAt(point, sections);
        Candidate chosen = chooseBuilding(point, section, buildings, thresholds);
        if (chosen == null) {
            return new LocationDescription(section, null, null, null, 0, LocationText.sectionOnly(section));
        }
        PlanarPoint anchor = PlanarGeometry.closestPoint(chosen.building().footprint(), point);
        String name = BuildingNamer.nameOf(chosen.building(), anchor, buildings, places, thresholds.nameM());
        String text = LocationText.of(section, name, chosen.relation(), chosen.distance());
        return new LocationDescription(section, chosen.building(), name, chosen.relation(), chosen.distance(), text);
    }

    private static SectionCandidate sectionAt(PlanarPoint point, List<SectionCandidate> sections) {
        return sections.stream()
                .filter(s -> PlanarGeometry.contains(s.boundary(), point))
                .findFirst()
                .orElse(null);
    }

    private static Candidate chooseBuilding(PlanarPoint point, SectionCandidate section,
                                            List<BuildingCandidate> buildings, ProximityThresholds thresholds) {
        Candidate nearest = closest(point, buildings, BuildingRelation.NEAREST);
        if (nearest == null || nearest.distance() < thresholds.insideM()) {
            return nearest == null ? null : new Candidate(nearest.building(), BuildingRelation.INSIDE, 0);
        }
        if (section != null) {
            List<BuildingCandidate> adjacent = buildings.stream()
                    .filter(b -> PlanarGeometry.gap(section.boundary(), b.footprint()) <= thresholds.adjacentM())
                    .toList();
            Candidate best = closest(point, adjacent, BuildingRelation.ADJACENT_TO_SECTION);
            if (best != null) {
                return best;
            }
        }
        return nearest;
    }

    private static Candidate closest(PlanarPoint point, List<BuildingCandidate> buildings, BuildingRelation relation) {
        Candidate best = null;
        for (BuildingCandidate b : buildings) {
            double d = PlanarGeometry.distance(b.footprint(), point);
            if (best == null || d < best.distance() || (d == best.distance() && b.id() < best.building().id())) {
                best = new Candidate(b, relation, d);
            }
        }
        return best;
    }

    private record Candidate(BuildingCandidate building, BuildingRelation relation, double distance) {
    }
}
