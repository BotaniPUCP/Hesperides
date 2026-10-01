package pe.edu.pucp.hesperides.modules.map.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;

/**
 * Todas las capas del mapa en una respuesta.
 *
 * @param layers objeto JSON con una FeatureCollection por capa, ya armada por
 *               PostGIS. Viaja tal cual ({@code @JsonRawValue}): deserializarla
 *               para volver a serializarla solo costaría memoria y tiempo.
 * @param attributionRequired si quedan edificios de OpenStreetMap, el mapa debe
 *               mostrar la atribución (SPEC-102 D-03)
 */
public record MapLayersResponse(long version, MapOrigin origin, boolean attributionRequired,
                                @JsonRawValue String layers) {
}
