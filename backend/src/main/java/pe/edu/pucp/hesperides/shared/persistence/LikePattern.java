package pe.edu.pucp.hesperides.shared.persistence;

/** Patrón LIKE de «contiene», con los comodines del texto escapados. */
public final class LikePattern {

    private LikePattern() {
    }

    public static String contains(String text) {
        if (text == null) {
            return null;
        }
        String escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
