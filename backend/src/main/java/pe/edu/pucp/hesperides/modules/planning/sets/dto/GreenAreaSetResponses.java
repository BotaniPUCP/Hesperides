package pe.edu.pucp.hesperides.modules.planning.sets.dto;

import java.time.Instant;
import java.util.List;

/** Respuestas de SPEC-203 §3.1. */
public final class GreenAreaSetResponses {

    private GreenAreaSetResponses() {
    }

    /** Cuántos ejemplares de un tipo (Palmera, Árbol…) tiene un conjunto. */
    public record TypeCount(String label, int count) {
    }

    public record ZoneRef(long id, String code, String name, String displayName,
                          String landscapeCode, String sectorName) {
    }

    /**
     * Un ejemplar del catastro. La sección y el sector salen de su posición (no se
     * guardan): son nulos si está en una vereda o plaza, fuera de toda sección.
     */
    public record ElementRef(long id, String code, String displayName, String typeLabel,
                             String sectionName, Long sectorId, String sectorName) {
    }

    /**
     * Un conjunto en la lista. {@code specimenTypes}: sus ejemplares por tipo, del más
     * numeroso al menos. Qué se planifica en él se ve en Planificación, no aquí.
     */
    public record Summary(long id, String name, String description, int zoneCount, int elementCount,
                          List<TypeCount> specimenTypes, long version, Instant updatedAt) {
    }

    public record Detail(long id, String name, String description, long version,
                         List<ZoneRef> zones, List<ElementRef> elements,
                         List<String> warnings) {
    }
}
