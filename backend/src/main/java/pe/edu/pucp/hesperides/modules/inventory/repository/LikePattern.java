package pe.edu.pucp.hesperides.modules.inventory.repository;

/** Patrón LIKE de «contiene», con los comodines del texto escapados. */
final class LikePattern {

    private LikePattern() {
    }

    static String contains(String text) {
        if (text == null) {
            return null;
        }
        String escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
