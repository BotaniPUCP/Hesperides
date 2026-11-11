package pe.edu.pucp.hesperides.modules.planning.sets.dto;

import java.util.List;

/** Respuestas de SPEC-203 §3.1. */
public final class GreenAreaSetResponses {

    private GreenAreaSetResponses() {
    }

    public record ActivityRef(long id, String label) {
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

    public record Summary(long id, String name, String description, int zoneCount, int elementCount,
                          List<ActivityRef> activities, long version) {
    }

    public record Detail(long id, String name, String description, long version,
                         List<ActivityRef> activities, List<ZoneRef> zones, List<ElementRef> elements,
                         List<String> warnings) {
    }
}
