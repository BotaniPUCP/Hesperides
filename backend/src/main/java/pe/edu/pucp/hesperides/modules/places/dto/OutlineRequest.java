package pe.edu.pucp.hesperides.modules.places.dto;

import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * De dónde sale el contorno: uno o varios edificios, una sección, un componente
 * del mapa, una geometría GeoJSON dibujada, o los lugares hijos de un complejo.
 * Como mucho una fuente; ninguna para un interior.
 */
public record OutlineRequest(List<Long> buildingIds, String zoneCode, String featureCode, JsonNode geometry,
        Boolean fromChildren) {

    public List<Long> buildingIdsOrEmpty() {
        return buildingIds == null ? List.of() : buildingIds.stream().distinct().toList();
    }

    public boolean takesChildren() {
        return Boolean.TRUE.equals(fromChildren);
    }

    public int sourcesGiven() {
        int count = 0;
        if (!buildingIdsOrEmpty().isEmpty()) {
            count++;
        }
        if (zoneCode != null && !zoneCode.isBlank()) {
            count++;
        }
        if (featureCode != null && !featureCode.isBlank()) {
            count++;
        }
        if (geometry != null && !geometry.isNull()) {
            count++;
        }
        if (takesChildren()) {
            count++;
        }
        return count;
    }

    public String geoJson() {
        return geometry == null || geometry.isNull() ? null : geometry.toString();
    }
}
