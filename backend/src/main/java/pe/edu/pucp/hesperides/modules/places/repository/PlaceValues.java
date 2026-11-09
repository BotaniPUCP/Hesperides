package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;

/** Un lugar con los ids ya resueltos; {@code geoJson} solo si el contorno se dibujó. */
public record PlaceValues(String name, long kindItemId, long categoryItemId, Long parentId, List<Long> buildingIds,
        Long zoneId, Long featureId, String geoJson, boolean fromChildren) {

    /** El que va en la columna building_id, que leen las ramas anteriores. */
    Long firstBuildingId() {
        return buildingIds.isEmpty() ? null : buildingIds.get(0);
    }
}
