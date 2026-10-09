package pe.edu.pucp.hesperides.modules.places.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceRef;

/** Peticiones y respuestas de la migración de referencias antiguas al catálogo. */
public final class ReferenceLinkDtos {

    private ReferenceLinkDtos() {
    }

    /** Enlaza referencias a un lugar y, si se indica, a una de sus perspectivas. */
    public record LinkRequest(
            @NotEmpty(message = "Indica al menos una referencia") List<@NotBlank String> referenceCodes,
            @NotBlank(message = "El lugar es obligatorio") String placeCode,
            Long perspectiveId) {
    }

    public record DiscardRequest(@NotEmpty(message = "Indica al menos una referencia") List<@NotBlank String> referenceCodes) {
    }

    public record Suggestion(PlaceRef place, double score) {
    }

    /**
     * Referencias pendientes con el mismo nombre, que se deciden juntas.
     *
     * @param detectedSide FRONT, BACK o SIDE si el texto nombra un lado; null si no
     */
    public record QueueGroup(String name, String category, List<String> referenceCodes, double lat, double lon,
            String detectedSide, boolean sideUncertain, List<Suggestion> suggestions) {
    }

    public record QueuePage(int page, int size, int totalGroups, List<QueueGroup> groups) {
    }

    public record Progress(int total, int linked, int discarded, int pending) {
    }
}
