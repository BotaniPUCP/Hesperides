package pe.edu.pucp.hesperides.engine.proximity;

/**
 * Plano tangente local: convierte latitud y longitud WGS 84 a metros alrededor
 * de un origen. En un campus de 1 km el error frente a una proyección rigurosa es
 * de milímetros.
 *
 * Usa los radios del elipsoide WGS 84 en la latitud del origen. El prototipo v39
 * mezclaba dos factores de latitud (110 574 y 111 320 m/°) y desalineaba lugares
 * y polígonos hasta 4 m (SPEC-102 D-06); esta es la única conversión del sistema
 * y el visor replica la misma fórmula.
 */
public final class LocalPlane {

    private static final double SEMI_MAJOR_AXIS_M = 6_378_137.0;
    private static final double ECCENTRICITY_SQ = 0.00669437999014;

    private final double lat0;
    private final double lon0;
    private final double metresPerDegreeLat;
    private final double metresPerDegreeLon;

    public LocalPlane(double lat0, double lon0) {
        this.lat0 = lat0;
        this.lon0 = lon0;
        double phi = Math.toRadians(lat0);
        double w = 1 - ECCENTRICITY_SQ * Math.sin(phi) * Math.sin(phi);
        double meridianRadius = SEMI_MAJOR_AXIS_M * (1 - ECCENTRICITY_SQ) / Math.pow(w, 1.5);
        double normalRadius = SEMI_MAJOR_AXIS_M / Math.sqrt(w);
        this.metresPerDegreeLat = Math.toRadians(1) * meridianRadius;
        this.metresPerDegreeLon = Math.toRadians(1) * normalRadius * Math.cos(phi);
    }

    public PlanarPoint toPlane(double lat, double lon) {
        return new PlanarPoint((lon - lon0) * metresPerDegreeLon, (lat - lat0) * metresPerDegreeLat);
    }

    /** Inversa de {@link #toPlane}: devuelve {lat, lon}. */
    public double[] toLatLon(PlanarPoint p) {
        return new double[] {lat0 + p.y() / metresPerDegreeLat, lon0 + p.x() / metresPerDegreeLon};
    }
}
