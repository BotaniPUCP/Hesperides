package pe.edu.pucp.hesperides.engine.proximity;

/** Edificio del campus. {@code name} es nulo si ni el vocabulario ni OSM lo nombran. */
public record BuildingCandidate(long id, String name, PlanarShape footprint) {
}
