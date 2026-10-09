package pe.edu.pucp.hesperides.engine.places;

import java.util.Optional;
import pe.edu.pucp.hesperides.engine.proximity.PlanarPoint;

/**
 * Los ocho rumbos con que se distinguen las perspectivas «al lado» de un lugar.
 * Ocho y no cuatro: en un edificio de cinco lados, dos caras vecinas caerían
 * en el mismo rumbo y tendrían el mismo nombre.
 */
public enum CompassPoint {
    NORTH("norte"),
    NORTH_EAST("noreste"),
    EAST("este"),
    SOUTH_EAST("sureste"),
    SOUTH("sur"),
    SOUTH_WEST("suroeste"),
    WEST("oeste"),
    NORTH_WEST("noroeste");

    private static final double SECTOR_DEGREES = 360.0 / 8;

    /** Por debajo de esta distancia al centro no hay rumbo: la perspectiva está encima del lugar. */
    private static final double MIN_DISTANCE_M = 0.5;

    private final String label;

    CompassPoint(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Rumbo en grados, 0 al norte y creciendo hacia el este. */
    public static CompassPoint ofBearing(double degrees) {
        double normalized = ((degrees % 360) + 360) % 360;
        int sector = (int) Math.floor((normalized + SECTOR_DEGREES / 2) / SECTOR_DEGREES) % 8;
        return values()[sector];
    }

    /** Dónde queda {@code point} visto desde {@code center}. */
    public static Optional<CompassPoint> from(PlanarPoint center, PlanarPoint point) {
        double dx = point.x() - center.x(), dy = point.y() - center.y();
        if (Math.hypot(dx, dy) < MIN_DISTANCE_M) {
            return Optional.empty();
        }
        return Optional.of(ofBearing(Math.toDegrees(Math.atan2(dx, dy))));
    }
}
