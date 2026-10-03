package pe.edu.pucp.hesperides.engine.places;

/** Un lugar cercano a una perspectiva, con su distancia en metros. */
public record LandmarkCandidate(long placeId, String name, double distanceM) {
}
