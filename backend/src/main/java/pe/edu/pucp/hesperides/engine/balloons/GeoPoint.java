package pe.edu.pucp.hesperides.engine.balloons;

/** Un punto WGS 84 donde se clava un globo: latitud y longitud en grados. */
public record GeoPoint(double lat, double lon) {

    private static final double METERS_PER_DEGREE = 111_320;

    /** El punto corrido unos metros al este y al norte; a la escala de un jardín, el plano basta. */
    public GeoPoint moved(double eastMeters, double northMeters) {
        double lonMeters = METERS_PER_DEGREE * Math.cos(Math.toRadians(lat));
        return new GeoPoint(lat + northMeters / METERS_PER_DEGREE, lon + eastMeters / lonMeters);
    }
}
