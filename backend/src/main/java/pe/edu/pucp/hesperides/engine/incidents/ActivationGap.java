package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Lo que falta para activar una incidencia (SPEC-201 §3.6).
 *
 * <p>Es un enum de Java porque no es un catálogo: cada valor es una condición de la regla.
 */
public enum ActivationGap {
    TYPE,
    URGENCY,
    LOCATION,
    PROVIDER,
    AGREED_DAYS,
    TALL_TREE_NEEDS_THIRD_PARTY
}
