package pe.edu.pucp.hesperides.engine.places;

/** Distancias y límites del catálogo de lugares. */
public final class PlaceThresholds {

    /** Un lugar más lejos que esto de la perspectiva no sirve para ubicarla. */
    public static final double LANDMARK_MAX_M = 50;

    /** Radio en que se sugieren perspectivas a quien está en el campus. */
    public static final double NEARBY_PERSPECTIVE_M = 25;

    /** Zona › complejo › lugar: más niveles alargan el nombre y no aportan a la ubicación. */
    public static final int MAX_DEPTH = 3;

    private PlaceThresholds() {
    }
}
