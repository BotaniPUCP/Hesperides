package pe.edu.pucp.hesperides.engine.places;

/**
 * Un lugar del catálogo que podría ser el de una referencia.
 *
 * @param similarity parecido del nombre (o un alias) con el texto, de 0 a 1
 * @param distanceM  del punto de la referencia al contorno del lugar; null si el lugar no tiene contorno
 */
public record SuggestionCandidate(long placeId, String name, double similarity, Double distanceM) {
}
