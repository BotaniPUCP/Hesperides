package pe.edu.pucp.hesperides.modules.places.dto;

import java.time.LocalDate;
import java.util.List;

/** Respuestas del catálogo de lugares. Las rutas de foto son relativas a la API. */
public final class PlaceResponses {

    private PlaceResponses() {
    }

    public record CodeLabel(String code, String label) {
    }

    public record PlaceRef(String code, String name) {
    }

    /** Una tarjeta del catálogo. */
    public record PlaceSummary(String code, String name, PlaceRef parent, CodeLabel kind, CodeLabel category,
            String mainPhotoUrl, int perspectiveCount, boolean hasFront, boolean hasBack) {
    }

    /** De dónde sale el contorno: BUILDING, ZONE, FEATURE, DRAWN o INHERITED (interiores). */
    public record Outline(String source, Long buildingId, String zoneCode, String featureCode, Double centerLat,
            Double centerLon) {
    }

    public record Photo(long id, String thumbnailUrl, String fullUrl, String author, LocalDate takenOn) {
    }

    public record Perspective(long id, CodeLabel side, String displayName, String compass, PlaceRef landmark,
            double lat, double lon, double headingDeg, List<Photo> photos) {
    }

    public record InteriorGroup(CodeLabel view, List<Photo> photos) {
    }

    public record PlaceDetail(String code, String name, PlaceRef parent, CodeLabel kind, CodeLabel category,
            Outline outline, List<String> aliases, List<PlaceRef> children, List<Photo> mainPhotos,
            List<Perspective> perspectives, List<InteriorGroup> interior) {
    }

    /** Una perspectiva sugerida a quien está en el campus. */
    public record NearbyPerspective(long id, String displayName, PlaceRef place, double distanceM, String thumbnailUrl) {
    }
}
