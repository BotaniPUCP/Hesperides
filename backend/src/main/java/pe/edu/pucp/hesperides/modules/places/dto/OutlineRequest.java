package pe.edu.pucp.hesperides.modules.places.dto;

import tools.jackson.databind.JsonNode;

/**
 * De dónde sale el contorno: un edificio, una sección o un componente del mapa,
 * o una geometría GeoJSON dibujada. Como mucho uno; ninguno para un interior.
 */
public record OutlineRequest(Long buildingId, String zoneCode, String featureCode, JsonNode geometry) {

    public int sourcesGiven() {
        int count = 0;
        if (buildingId != null) {
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
        return count;
    }

    public String geoJson() {
        return geometry == null || geometry.isNull() ? null : geometry.toString();
    }
}
