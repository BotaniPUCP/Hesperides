package pe.edu.pucp.hesperides.modules.balloons.placement;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.balloons.GardenGrid;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Posa cada globo sobre un jardín o un ejemplar, nunca sobre un edificio (SPEC-113 §5.3b). Los que
 * comparten jardín se reparten en una cuadrícula centrada dentro de él, el más urgente al centro:
 * quedan quietos en el mapa y el navegador no tiene que separarlos al acercarse.
 */
@Component
@RequiredArgsConstructor
public class BalloonPlacer {

    /** Separaciones a probar, en metros: la mayor que quepa en el jardín, para que no se pisen. */
    private static final double[] SPACINGS = {12, 8, 5, 3, 1.5};
    /**
     * Distancia mínima al borde, en separaciones: a media separación, los globos quedan tan lejos del
     * borde como entre sí; un punto apenas dentro del polígono se ve en el filo, sobre la vereda.
     */
    private static final double EDGE_MARGIN = 0.5;

    private final GardenLocator gardens;

    /** Los puntos, en el orden recibido, que debe ser de más a menos urgente. */
    public List<GeoPoint> place(List<GeoPoint> pins) {
        List<GardenSpot> spots = gardens.spotsOf(pins);
        List<GeoPoint> placed = new ArrayList<>(pins);
        for (Map.Entry<Long, List<Integer>> garden : byGarden(spots).entrySet()) {
            List<Integer> members = garden.getValue();
            GardenSpot spot = spots.get(members.getFirst());
            if (members.size() == 1 && spot.inside()) {
                continue;
            }
            List<GeoPoint> spread = spread(garden.getKey(), spot.center(), members.size());
            for (int i = 0; i < members.size(); i++) {
                placed.set(members.get(i), spread.get(i));
            }
        }
        return placed;
    }

    private static Map<Long, List<Integer>> byGarden(List<GardenSpot> spots) {
        Map<Long, List<Integer>> byGarden = new LinkedHashMap<>();
        for (int i = 0; i < spots.size(); i++) {
            if (spots.get(i).gardenId() != null) {
                byGarden.computeIfAbsent(spots.get(i).gardenId(), id -> new ArrayList<>()).add(i);
            }
        }
        return byGarden;
    }

    /** La mayor separación con la que todos caben dentro, lejos del borde; si ni la menor alcanza, los que sobran van al centro. */
    private List<GeoPoint> spread(long gardenId, GeoPoint center, int count) {
        List<GeoPoint> inside = List.of();
        for (double spacing : SPACINGS) {
            List<GeoPoint> candidates = GardenGrid.offsets(count, spacing).stream()
                    .map(o -> center.moved(o[0], o[1])).toList();
            List<Boolean> covered = gardens.covered(gardenId, candidates, spacing * EDGE_MARGIN);
            inside = new ArrayList<>();
            for (int i = 0; i < candidates.size() && inside.size() < count; i++) {
                if (covered.get(i)) {
                    inside.add(candidates.get(i));
                }
            }
            if (inside.size() == count) {
                return inside;
            }
        }
        List<GeoPoint> filled = new ArrayList<>(inside);
        while (filled.size() < count) {
            filled.add(center);
        }
        return filled;
    }
}
