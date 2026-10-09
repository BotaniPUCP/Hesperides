package pe.edu.pucp.hesperides.engine.duplicates;

/** El elemento ya registrado que podría ser el mismo, y a qué distancia está. */
public record DuplicateMatch(String code, double distanceM) {
}
