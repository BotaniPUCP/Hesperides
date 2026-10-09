package pe.edu.pucp.hesperides.engine.places;

import java.util.List;
import java.util.Optional;

/** Reglas del árbol de lugares: sin ciclos y como mucho {@link PlaceThresholds#MAX_DEPTH} niveles. */
public final class PlaceHierarchy {

    private PlaceHierarchy() {
    }

    /**
     * @param placeId       el lugar que se mueve; null si aún no existe
     * @param parentChain   el padre propuesto seguido de sus ancestros, del más cercano al más lejano
     * @param subtreeHeight niveles del lugar con sus descendientes (1 si no tiene hijos)
     */
    public static Optional<HierarchyViolation> check(Long placeId, List<Long> parentChain, int subtreeHeight) {
        if (placeId != null && parentChain.contains(placeId)) {
            return Optional.of(HierarchyViolation.CYCLE);
        }
        if (parentChain.size() + subtreeHeight > PlaceThresholds.MAX_DEPTH) {
            return Optional.of(HierarchyViolation.TOO_DEEP);
        }
        return Optional.empty();
    }
}
