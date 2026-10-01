package pe.edu.pucp.hesperides.engine.proximity;

import java.util.List;

/**
 * Polígono en el plano local. Cada anillo es una lista plana x0, y0, x1, y1…;
 * el primero es el exterior y los demás, huecos.
 */
public record PlanarPolygon(List<double[]> rings) {

    public PlanarPolygon {
        if (rings == null || rings.isEmpty()) {
            throw new IllegalArgumentException("Un polígono necesita al menos su anillo exterior");
        }
    }
}
