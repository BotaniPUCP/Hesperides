package pe.edu.pucp.hesperides.modules.map.service;

import pe.edu.pucp.hesperides.engine.proximity.LocalPlane;
import pe.edu.pucp.hesperides.engine.proximity.PlanarPolygon;
import pe.edu.pucp.hesperides.engine.proximity.PlanarShape;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

/**
 * Convierte una geometría GeoJSON (Polygon o MultiPolygon, WGS 84) a la forma
 * plana que entiende el Engine. Vive en el servicio porque parsea JSON: el
 * Engine no depende de Jackson.
 */
final class GeoJsonPlanarReader {

    private final ObjectMapper objectMapper;
    private final LocalPlane plane;

    GeoJsonPlanarReader(ObjectMapper objectMapper, LocalPlane plane) {
        this.objectMapper = objectMapper;
        this.plane = plane;
    }

    PlanarShape read(String geoJson) {
        JsonNode geometry = objectMapper.readTree(geoJson);
        String type = geometry.get("type").asString();
        JsonNode coordinates = geometry.get("coordinates");
        List<PlanarPolygon> polygons = new ArrayList<>();
        switch (type) {
            case "Polygon" -> polygons.add(polygon(coordinates));
            case "MultiPolygon" -> coordinates.forEach(p -> polygons.add(polygon(p)));
            default -> throw new IllegalArgumentException("Geometría no admitida para cercanía: " + type);
        }
        return new PlanarShape(polygons);
    }

    private PlanarPolygon polygon(JsonNode rings) {
        List<double[]> planar = new ArrayList<>();
        for (JsonNode ring : rings) {
            double[] xy = new double[ring.size() * 2];
            int k = 0;
            for (JsonNode position : ring) {
                var p = plane.toPlane(position.get(1).asDouble(), position.get(0).asDouble());
                xy[k++] = p.x();
                xy[k++] = p.y();
            }
            planar.add(xy);
        }
        return new PlanarPolygon(planar);
    }
}
