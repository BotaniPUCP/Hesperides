package pe.edu.pucp.hesperides.engine.duplicates;

/** Un elemento ya registrado cerca del punto. {@code speciesKey} es nulo en tachos y bebederos. */
public record Nearby(String code, String speciesKey, double lat, double lon) {
}
