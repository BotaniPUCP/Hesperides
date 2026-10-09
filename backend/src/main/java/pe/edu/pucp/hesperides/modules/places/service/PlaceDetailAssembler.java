package pe.edu.pucp.hesperides.modules.places.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.proximity.LocalPlane;
import pe.edu.pucp.hesperides.engine.proximity.PlanarPoint;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.CodeLabel;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.InteriorGroup;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Outline;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Perspective;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Photo;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceRef;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository.PerspectiveRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository.PhotoRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceReadRepository.OutlineRow;

/** Arma las piezas de la ficha de un lugar a partir de las filas de la base. */
@Component
@RequiredArgsConstructor
class PlaceDetailAssembler {

    private final PlacePhotoRepository photos;

    Photo photo(PhotoRow row) {
        return new Photo(row.id(), url(row.id(), true), url(row.id(), false), row.author(), row.takenOn());
    }

    Perspective perspective(PerspectiveRow p, List<PhotoRow> placePhotos) {
        List<Photo> own = placePhotos.stream().filter(f -> Long.valueOf(p.id()).equals(f.perspectiveId()))
                .map(this::photo).toList();
        PlaceRef landmark = p.landmarkCode() == null ? null : new PlaceRef(p.landmarkCode(), p.landmarkName());
        return new Perspective(p.id(), new CodeLabel(p.sideCode(), p.sideLabel()), p.displayName(), p.compass(), landmark,
                p.lat(), p.lon(), p.headingDeg(), own);
    }

    List<Photo> mainPhotos(List<PhotoRow> placePhotos) {
        return placePhotos.stream().filter(f -> f.perspectiveId() == null && f.viewCode() == null).map(this::photo)
                .toList();
    }

    /** Agrupadas por vista, en el orden del catálogo (la consulta ya viene ordenada). */
    List<InteriorGroup> interior(List<PhotoRow> placePhotos) {
        Map<String, List<PhotoRow>> byView = placePhotos.stream().filter(f -> f.viewCode() != null)
                .collect(Collectors.groupingBy(PhotoRow::viewCode, java.util.LinkedHashMap::new, Collectors.toList()));
        return byView.values().stream().map(rows -> new InteriorGroup(
                new CodeLabel(rows.get(0).viewCode(), rows.get(0).viewLabel()), rows.stream().map(this::photo).toList()))
                .toList();
    }

    Outline outline(OutlineRow o) {
        String source = o.buildingId() != null ? "BUILDING" : o.zoneCode() != null ? "ZONE"
                : o.featureCode() != null ? "FEATURE" : o.drawn() ? "DRAWN" : "INHERITED";
        return new Outline(source, o.buildingId(), o.zoneCode(), o.featureCode(), o.lat(), o.lon());
    }

    String firstThumbnail(long placeId, long perspectiveId) {
        return photos.byPlace(placeId).stream().filter(f -> Long.valueOf(perspectiveId).equals(f.perspectiveId()))
                .findFirst().map(f -> url(f.id(), true)).orElse(null);
    }

    double distanceM(double lat0, double lon0, double lat, double lon) {
        PlanarPoint p = new LocalPlane(lat0, lon0).toPlane(lat, lon);
        return Math.hypot(p.x(), p.y());
    }

    static String url(long photoId, boolean thumbnail) {
        return "/files/places/" + photoId + (thumbnail ? "?size=thumb" : "?size=full");
    }
}
