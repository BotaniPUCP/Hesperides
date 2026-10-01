package pe.edu.pucp.hesperides.engine.proximity;

/**
 * Umbrales del algoritmo, en metros (SPEC-102 D-04).
 *
 * Son fijos: los del prototipo validado. Se muestran en la pantalla de
 * parámetros como restringidos (RestrictedParameters) leyendo estas mismas
 * constantes, así que lo que se ve es lo que se aplica.
 */
public record ProximityThresholds(double insideM, double adjacentM, double nameM) {

    public static final double INSIDE_M = 0.5;
    public static final double ADJACENT_M = 3;
    public static final double NAME_M = 10;

    public static final ProximityThresholds FIXED = new ProximityThresholds(INSIDE_M, ADJACENT_M, NAME_M);
}
