package pe.edu.pucp.hesperides.engine.proximity;

/** Referencia que puede dar nombre a un edificio sin nombre. */
public record NamedPoint(String name, PlanarPoint point) {
}
