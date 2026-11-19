package pe.edu.pucp.hesperides.engine.balloons;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Dónde van los globos que comparten jardín (SPEC-113 §5.3b): una cuadrícula en metros alrededor
 * del centro del jardín, de la más cercana al centro a la más lejana. Con un número par de globos
 * la cuadrícula se corre media celda, para que el grupo quede centrado (dos globos a cada lado del
 * centro, no uno encima y otro al costado). Quien llama descarta los que caen fuera del jardín.
 */
public final class GardenGrid {

    /** Anillos de más alrededor de lo justo: dejan candidatos para jardines angostos o con huecos. */
    private static final int EXTRA_RINGS = 3;

    private GardenGrid() {
    }

    /** Desplazamientos {este, norte} en metros, ordenados por distancia al centro y luego por posición. */
    public static List<double[]> offsets(int count, double spacing) {
        double shift = count % 2 == 0 ? 0.5 : 0;
        int rings = (int) Math.ceil(Math.sqrt(count)) + EXTRA_RINGS;
        List<double[]> offsets = new ArrayList<>();
        for (int i = -rings; i <= rings; i++) {
            for (int j = -rings; j <= rings; j++) {
                offsets.add(new double[]{(i + shift) * spacing, (j + (count == 2 ? 0 : shift)) * spacing});
            }
        }
        // A igual distancia, primero la fila del centro y de arriba: tres globos quedan en fila, centrados.
        offsets.sort(Comparator.<double[]>comparingDouble(o -> Math.round(Math.hypot(o[0], o[1]) * 1e6) / 1e6)
                .thenComparingDouble(o -> Math.abs(o[1])).thenComparingDouble(o -> -o[1])
                .thenComparingDouble(o -> o[0]));
        return offsets;
    }
}
