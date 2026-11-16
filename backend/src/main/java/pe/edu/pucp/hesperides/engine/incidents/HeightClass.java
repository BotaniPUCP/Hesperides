package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Clase de altura de un árbol, que decide la regla de 5 m (catálogo 5.2, SPEC-201 §3.6).
 *
 * <p>Es un enum de Java porque no es un catálogo configurable: el umbral de 5 m es una regla de
 * negocio y cada valor es una rama de ella.
 */
public enum HeightClass {
    UNDER_5M,
    OVER_5M,
    UNCLASSIFIED,
    NOT_APPLICABLE;

    public static HeightClass fromCode(String code) {
        if (code == null) return NOT_APPLICABLE;
        try {
            return valueOf(code);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unknown height class: " + code, ex);
        }
    }
}
