package pe.edu.pucp.hesperides.engine.balloons;

import java.util.ArrayList;
import java.util.List;

/**
 * Parte las anclas de un conjunto de jardines en minigrupos (SPEC-113 §5.3): dos
 * anclas van juntas si están a {@code linkMeters} o menos, de forma transitiva
 * (enlace simple). Así un conjunto disperso no queda como un solo globo clavado
 * entre jardines lejanos.
 *
 * <p>Los grupos salen en el orden en que aparece su primera ancla, y cada grupo
 * conserva el orden de entrada: la misma entrada da siempre los mismos grupos, y
 * con ellos los mismos ids de globo.
 */
public final class MiniGroups {

    /** Distancia máxima entre dos jardines del mismo minigrupo; se ajusta al verlo en el mapa. */
    public static final double LINK_METERS = 60;

    /** Radio medio de la Tierra: a escala de campus, la aproximación equirrectangular basta. */
    private static final double EARTH_RADIUS_M = 6_371_000;

    private MiniGroups() {
    }

    public static List<List<GeoPoint>> split(List<GeoPoint> anchors, double linkMeters) {
        int[] group = new int[anchors.size()];
        java.util.Arrays.fill(group, -1);
        int groups = 0;
        for (int start = 0; start < anchors.size(); start++) {
            if (group[start] < 0) {
                spread(anchors, group, start, groups++, linkMeters);
            }
        }
        List<List<GeoPoint>> result = new ArrayList<>();
        for (int g = 0; g < groups; g++) {
            List<GeoPoint> members = new ArrayList<>();
            for (int i = 0; i < anchors.size(); i++) {
                if (group[i] == g) {
                    members.add(anchors.get(i));
                }
            }
            result.add(List.copyOf(members));
        }
        return result;
    }

    /** El ancla más cercana al centro del grupo: el globo nunca cae entre dos jardines, sobre un edificio. */
    public static GeoPoint pin(List<GeoPoint> group) {
        double lat = group.stream().mapToDouble(GeoPoint::lat).average().orElseThrow();
        double lon = group.stream().mapToDouble(GeoPoint::lon).average().orElseThrow();
        GeoPoint center = new GeoPoint(lat, lon);
        GeoPoint best = group.getFirst();
        for (GeoPoint p : group) {
            if (meters(p, center) < meters(best, center)) {
                best = p;
            }
        }
        return best;
    }

    static double meters(GeoPoint a, GeoPoint b) {
        double meanLat = Math.toRadians((a.lat() + b.lat()) / 2);
        double dx = Math.toRadians(b.lon() - a.lon()) * Math.cos(meanLat);
        double dy = Math.toRadians(b.lat() - a.lat());
        return Math.sqrt(dx * dx + dy * dy) * EARTH_RADIUS_M;
    }

    private static void spread(List<GeoPoint> anchors, int[] group, int start, int id, double linkMeters) {
        java.util.ArrayDeque<Integer> pending = new java.util.ArrayDeque<>(List.of(start));
        group[start] = id;
        while (!pending.isEmpty()) {
            int current = pending.pop();
            for (int other = 0; other < anchors.size(); other++) {
                if (group[other] < 0 && meters(anchors.get(current), anchors.get(other)) <= linkMeters) {
                    group[other] = id;
                    pending.push(other);
                }
            }
        }
    }
}
