package pe.edu.pucp.hesperides.engine.places;

/**
 * Lados de una perspectiva. Coinciden con los códigos del catálogo de sistema
 * PERSPECTIVE_SIDE: cada uno tiene su regla de nombre y de unicidad aquí.
 */
public enum PerspectiveSide {
    FRONT("Frente de", true),
    BACK("Espalda de", true),
    SIDE("Al lado de", false);

    private final String prefix;
    private final boolean onePerPlace;

    PerspectiveSide(String prefix, boolean onePerPlace) {
        this.prefix = prefix;
        this.onePerPlace = onePerPlace;
    }

    public String prefix() {
        return prefix;
    }

    /** Un lugar tiene un solo frente y una sola espalda; lados, los que hagan falta. */
    public boolean onePerPlace() {
        return onePerPlace;
    }
}
