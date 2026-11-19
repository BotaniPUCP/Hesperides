package pe.edu.pucp.hesperides.engine.campusevents;

/**
 * Dónde aplica un evento (SPEC-114 §2.1). Es un enum de código y no un catálogo: cada valor
 * exige una regla distinta sobre la zona del evento (§2.5).
 */
public enum EventScope {
    CAMPUS,
    SECTOR,
    SECTION
}
