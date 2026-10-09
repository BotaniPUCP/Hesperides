package pe.edu.pucp.hesperides.engine.places;

/** Por qué un lugar no puede colgar del padre propuesto. */
public enum HierarchyViolation {
    CYCLE,
    TOO_DEEP
}
