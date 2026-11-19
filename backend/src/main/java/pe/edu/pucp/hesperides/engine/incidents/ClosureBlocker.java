package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Lo que impide cerrar una incidencia (SPEC-201 §3.8). La pantalla lo muestra tal cual.
 *
 * <p>Es un enum de Java porque no es un catálogo: cada valor es una condición de la regla de cierre.
 */
public enum ClosureBlocker {
    NOT_ACTIVE,
    NO_LINKED_WORK,
    WORK_NOT_VALIDATED,
    CANCELLED_WORK
}
