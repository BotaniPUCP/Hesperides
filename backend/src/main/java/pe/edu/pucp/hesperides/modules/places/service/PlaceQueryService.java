package pe.edu.pucp.hesperides.modules.places.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.CodeLabel;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceDetail;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceRef;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceSummary;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository.PhotoRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceReadRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceReadRepository.CategoryRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;

/** Lecturas del catálogo: las tarjetas y la ficha completa de un lugar. */
@Service
@RequiredArgsConstructor
public class PlaceQueryService {

    private final PlaceReadRepository reads;
    private final PlaceRepository places;
    private final PerspectiveRepository perspectives;
    private final PlacePhotoRepository photos;
    private final PlaceDetailAssembler assembler;

    @Transactional(readOnly = true)
    public List<PlaceSummary> list(String search, String categoryCode, String kindCode) {
        return reads.list(blankToNull(search), blankToNull(categoryCode), blankToNull(kindCode)).stream()
                .map(r -> new PlaceSummary(r.code(), r.name(),
                        r.parentCode() == null ? null : new PlaceRef(r.parentCode(), r.parentName()),
                        new CodeLabel(r.kindCode(), r.kindLabel()), new CodeLabel(r.categoryCode(), r.categoryLabel()),
                        r.mainPhotoId() == null ? null : PlaceDetailAssembler.url(r.mainPhotoId(), true),
                        r.perspectives(), r.hasFront(), r.hasBack()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PlaceDetail detail(String code) {
        PlaceRow place = places.byCode(code);
        CategoryRow kc = reads.kindAndCategory(place.id());
        List<PhotoRow> placePhotos = photos.byPlace(place.id());
        PlaceRef parent = place.parentId() == null ? null
                : new PlaceRef(places.byId(place.parentId()).code(), place.parentName());
        return new PlaceDetail(place.code(), place.name(), parent, new CodeLabel(kc.kindCode(), kc.kindLabel()),
                new CodeLabel(kc.categoryCode(), kc.categoryLabel()), assembler.outline(reads.outline(place.id())),
                reads.aliases(place.id()),
                reads.children(place.id()).stream().map(c -> new PlaceRef(c[0], c[1])).toList(),
                assembler.mainPhotos(placePhotos),
                perspectives.byPlace(place.id()).stream().map(p -> assembler.perspective(p, placePhotos)).toList(),
                assembler.interior(placePhotos));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
