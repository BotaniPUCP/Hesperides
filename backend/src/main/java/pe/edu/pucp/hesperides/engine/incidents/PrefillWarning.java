package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Avisos que acompañan al prellenado en la ficha de revisión (SPEC-201 §3.4).
 *
 * <p>Es un enum de Java porque no es un catálogo: cada valor es una rama de las reglas del agente.
 */
public enum PrefillWarning {
    VERIFY_HEIGHT,
    LOW_CONFIDENCE
}
