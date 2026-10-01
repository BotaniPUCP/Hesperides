package pe.edu.pucp.hesperides.engine.proximity;

import java.util.List;

/** Uno o varios polígonos: un edificio, una sección o un sector. */
public record PlanarShape(List<PlanarPolygon> polygons) {
}
