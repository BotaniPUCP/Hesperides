package pe.edu.pucp.hesperides.modules.places.service;

import java.time.LocalDate;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Photo;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceLookupRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository.FileKeys;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository.NewPhoto;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository.PhotoRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

/** Fotos de un lugar. Exterior: principal o de una perspectiva. Interior: principal o de una vista. */
@Service
@RequiredArgsConstructor
public class PlacePhotoService {

    private static final String ENTITY = "PlacePhoto";

    /** Qué foto es: de una perspectiva, de una vista interior, o ninguna de las dos (principal). */
    public record PhotoTarget(Long perspectiveId, String interiorViewCode, String author, LocalDate takenOn) {
    }

    private final PlaceRepository places;
    private final PerspectiveRepository perspectives;
    private final PlacePhotoRepository photos;
    private final PlaceLookupRepository lookup;
    private final PhotoStore store;
    private final PlaceDetailAssembler assembler;
    private final AuditService audit;

    @Transactional
    public Photo add(String placeCode, byte[] original, PhotoTarget target, String uploaderEmail) {
        PlaceRow place = places.byCode(placeCode);
        Long viewId = checkTarget(place, target);
        StoredPhoto stored = store.save("places/" + place.code(), original);
        long id = photos.append(new NewPhoto(place.id(), target.perspectiveId(), viewId, stored, blankToNull(target.author()),
                target.takenOn(), lookup.userId(uploaderEmail)));
        audit.record(AuditActionCode.PLACE_PHOTO_ADDED, ENTITY, id, Map.of("place", placeCode));
        return assembler.photo(new PhotoRow(id, target.perspectiveId(), target.interiorViewCode(), null,
                blankToNull(target.author()), target.takenOn()));
    }

    @Transactional
    public void delete(String placeCode, long photoId) {
        PlaceRow place = places.byCode(placeCode);
        if (!photos.softDelete(place.id(), photoId)) {
            throw new ResourceNotFoundException("Photo not found: " + photoId);
        }
        audit.record(AuditActionCode.PLACE_PHOTO_DELETED, ENTITY, photoId, Map.of("place", placeCode));
    }

    public FileKeys file(long photoId) {
        return photos.keys(photoId).orElseThrow(() -> new ResourceNotFoundException("Photo not found: " + photoId));
    }

    /** @return el id de la vista interior, o null */
    private Long checkTarget(PlaceRow place, PhotoTarget target) {
        boolean indoor = PlaceCatalogCodes.INDOOR.equals(place.kindCode());
        boolean hasView = target.interiorViewCode() != null && !target.interiorViewCode().isBlank();
        if (target.perspectiveId() != null && hasView) {
            throw new BusinessRuleException("A photo belongs to a perspective or to an indoor view, not both");
        }
        if (target.perspectiveId() != null) {
            perspectives.byId(place.id(), target.perspectiveId());
        }
        if (hasView && !indoor) {
            throw new BusinessRuleException("Indoor views are only for indoor places");
        }
        return hasView ? lookup.catalogItemId(PlaceCatalogCodes.INTERIOR_VIEW, target.interiorViewCode()) : null;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
