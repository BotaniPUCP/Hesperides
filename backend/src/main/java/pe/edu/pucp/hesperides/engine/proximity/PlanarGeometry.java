package pe.edu.pucp.hesperides.engine.proximity;

/**
 * Geometría plana mínima que necesita el algoritmo de cercanía: contención y
 * distancias. Es la del prototipo v39, sin dependencias: el Engine no usa JTS ni
 * PostGIS para poder probarse sin base de datos.
 */
final class PlanarGeometry {

    private PlanarGeometry() {
    }

    /** El punto está dentro del exterior de algún polígono y fuera de sus huecos. */
    static boolean contains(PlanarShape shape, PlanarPoint p) {
        for (PlanarPolygon polygon : shape.polygons()) {
            if (insideRing(polygon.rings().get(0), p) && !insideAnyHole(polygon, p)) {
                return true;
            }
        }
        return false;
    }

    /** Distancia del punto al borde; 0 si el punto está dentro. */
    static double distance(PlanarShape shape, PlanarPoint p) {
        if (contains(shape, p)) {
            return 0;
        }
        double best = Double.POSITIVE_INFINITY;
        for (PlanarPolygon polygon : shape.polygons()) {
            for (double[] ring : polygon.rings()) {
                best = Math.min(best, distanceToRing(ring, p));
            }
        }
        return best;
    }

    /** Separación mínima borde a borde; 0 si se tocan o se solapan. */
    static double gap(PlanarShape a, PlanarShape b) {
        if (anyVertexInside(a, b) || anyVertexInside(b, a)) {
            return 0;
        }
        return Math.min(vertexToEdgesDistance(a, b), vertexToEdgesDistance(b, a));
    }

    private static boolean insideAnyHole(PlanarPolygon polygon, PlanarPoint p) {
        for (int i = 1; i < polygon.rings().size(); i++) {
            if (insideRing(polygon.rings().get(i), p)) {
                return true;
            }
        }
        return false;
    }

    /** Ray casting: cuenta los cruces de una semirrecta hacia la derecha. */
    private static boolean insideRing(double[] ring, PlanarPoint p) {
        boolean inside = false;
        int n = ring.length / 2;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            double xi = ring[2 * i];
            double yi = ring[2 * i + 1];
            double xj = ring[2 * j];
            double yj = ring[2 * j + 1];
            if ((yi > p.y()) != (yj > p.y()) && p.x() < (xj - xi) * (p.y() - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    private static double distanceToRing(double[] ring, PlanarPoint p) {
        double best = Double.POSITIVE_INFINITY;
        int n = ring.length / 2;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            best = Math.min(best, segmentDistance(p, ring[2 * j], ring[2 * j + 1], ring[2 * i], ring[2 * i + 1]));
        }
        return best;
    }

    private static double segmentDistance(PlanarPoint p, double ax, double ay, double bx, double by) {
        double dx = bx - ax;
        double dy = by - ay;
        double lengthSq = dx * dx + dy * dy;
        double t = lengthSq == 0 ? 0 : Math.max(0, Math.min(1, ((p.x() - ax) * dx + (p.y() - ay) * dy) / lengthSq));
        return Math.hypot(p.x() - (ax + t * dx), p.y() - (ay + t * dy));
    }

    private static boolean anyVertexInside(PlanarShape vertices, PlanarShape area) {
        for (PlanarPolygon polygon : vertices.polygons()) {
            for (double[] ring : polygon.rings()) {
                for (int k = 0; k < ring.length; k += 2) {
                    if (contains(area, new PlanarPoint(ring[k], ring[k + 1]))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private static double vertexToEdgesDistance(PlanarShape vertices, PlanarShape edges) {
        double best = Double.POSITIVE_INFINITY;
        for (PlanarPolygon polygon : vertices.polygons()) {
            for (double[] ring : polygon.rings()) {
                for (int k = 0; k < ring.length; k += 2) {
                    best = Math.min(best, distance(edges, new PlanarPoint(ring[k], ring[k + 1])));
                }
            }
        }
        return best;
    }
}
