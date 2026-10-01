package pe.edu.pucp.hesperides.engine.proximity;

/**
 * Por qué se eligió el edificio. Es el resultado de un cálculo, no un estado que
 * alguien administre: por eso es un enum y no un catálogo (como ComplianceStatus).
 */
public enum BuildingRelation {
    /** El punto está dentro del edificio. */
    INSIDE,
    /** El edificio es contiguo a la sección que contiene el punto. */
    ADJACENT_TO_SECTION,
    /** Ninguno de los anteriores: el más cercano al punto. */
    NEAREST
}
