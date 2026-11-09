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

    public record Summary(long id, String name, String description, int zoneCount,
                          List<ActivityRef> activities, long version) {
    }

    public record Detail(long id, String name, String description, long version,
                         List<ActivityRef> activities, List<ZoneRef> zones, List<String> warnings) {
    }
}
