package pe.edu.pucp.hesperides.engine.proximity;

/** Sección (área verde) que puede contener el punto. */
public record SectionCandidate(long id, String code, String name, PlanarShape boundary) {
}
