package pe.edu.pucp.hesperides.engine.proximity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * La proyección que comparten backend y visor (SPEC-102 D-06). El prototipo usaba
 * dos factores distintos para la latitud y desalineaba lugares y polígonos hasta
 * 4 m; estas pruebas fijan una sola conversión.
 */
class LocalPlaneTest {

    private static final double LAT0 = -12.069676;
    private static final double LON0 = -77.080157;
    private final LocalPlane plane = new LocalPlane(LAT0, LON0);

    @Test
    @DisplayName("el origen cae en (0, 0)")
    void origen() {
        PlanarPoint p = plane.toPlane(LAT0, LON0);

        assertThat(p.x()).isZero();
        assertThat(p.y()).isZero();
    }

    @Test
    @DisplayName("un grado de latitud mide lo que dice el elipsoide WGS 84 a esa latitud")
    void escalaNorteSur() {
        // A 12° S, un minuto de latitud mide ~1843.7 m (no 1855.3, que daría 111 320 m/°).
        PlanarPoint p = plane.toPlane(LAT0 + 1.0 / 60, LON0);

        assertThat(p.y()).isCloseTo(1843.7, within(0.5));
    }

    @Test
    @DisplayName("el norte es y positivo y el este es x positivo")
    void orientacion() {
        PlanarPoint p = plane.toPlane(LAT0 + 0.001, LON0 + 0.001);

        assertThat(p.x()).isPositive();
        assertThat(p.y()).isPositive();
    }

    @Test
    @DisplayName("ida y vuelta sin pérdida apreciable en todo el campus")
    void idaYVuelta() {
        double lat = -12.0735;
        double lon = -77.0778;

        PlanarPoint p = plane.toPlane(lat, lon);
        double[] vuelta = plane.toLatLon(p);

        assertThat(vuelta[0]).isCloseTo(lat, within(1e-9));
        assertThat(vuelta[1]).isCloseTo(lon, within(1e-9));
    }
}
