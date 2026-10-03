package pe.edu.pucp.hesperides.modules.places.service;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.places.PlaceSuggester;
import pe.edu.pucp.hesperides.engine.places.ReferenceText;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceRef;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.LinkRequest;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.Progress;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.QueueGroup;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.QueuePage;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.Suggestion;
import pe.edu.pucp.hesperides.modules.places.repository.PerspectiveRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceLookupRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceRepository.PlaceRow;
import pe.edu.pucp.hesperides.modules.places.repository.PlaceSuggestionRepository;
import pe.edu.pucp.hesperides.modules.places.repository.ReferenceLinkRepository;
import pe.edu.pucp.hesperides.modules.places.repository.ReferenceLinkRepository.GroupRow;
import pe.edu.pucp.hesperides.modules.places.repository.ReferenceLinkRepository.ReferenceRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

/**
 * La migración gradual de las referencias antiguas: el sistema sugiere el lugar
 * y el lado; una persona acepta, corrige o descarta. Nada se enlaza solo.
 */
@Service
@RequiredArgsConstructor
public class ReferenceMigrationService {

    private static final String ENTITY = "PlaceReference";
    /** Dos decimales bastan para ordenar en pantalla y no aparentan una precisión que no hay. */
    private static final double SCORE_ROUNDING = 100.0;

    private final ReferenceLinkRepository links;
    private final PlaceSuggestionRepository suggestions;
    private final PlaceRepository places;
    private final PerspectiveRepository perspectives;
    private final PlaceLookupRepository lookup;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public QueuePage queue(String search, int page, int size) {
        String pattern = search == null || search.isBlank() ? null : LikePattern.contains(search.strip());
        List<QueueGroup> groups = links.pendingGroups(pattern, size, page * size).stream().map(this::withSuggestions).toList();
        return new QueuePage(page, size, links.countPendingGroups(pattern), groups);
    }

    @Transactional(readOnly = true)
    public Progress progress() {
        return links.progress();
    }

    @Transactional
    public void link(LinkRequest request, String userEmail) {
        PlaceRow place = places.byCode(request.placeCode());
        if (request.perspectiveId() != null) {
            perspectives.byId(place.id(), request.perspectiveId());
        }
        long userId = lookup.userId(userEmail);
        for (ReferenceRow ref : pending(request.referenceCodes())) {
            links.insert(ref.id(), place.id(), request.perspectiveId(), userId);
            places.addAliasIfNew(place.id(), ref.name().strip());
        }
        audit.record(AuditActionCode.PLACE_REFERENCES_LINKED, "Place", place.id(),
                Map.of("references", request.referenceCodes()));
    }

    @Transactional
    public void discard(List<String> codes, String userEmail) {
        long userId = lookup.userId(userEmail);
        pending(codes).forEach(ref -> links.insert(ref.id(), null, null, userId));
        audit.record(AuditActionCode.PLACE_REFERENCES_DISCARDED, ENTITY, null, Map.of("references", codes));
    }

    private List<ReferenceRow> pending(List<String> codes) {
        List<String> distinct = codes.stream().distinct().toList();
        List<ReferenceRow> found = links.byCodes(distinct);
        if (found.size() != distinct.size()) {
            throw new ResourceNotFoundException("Some references do not exist: " + distinct);
        }
        found.stream().filter(ReferenceRow::decided).findFirst().ifPresent(r -> {
            throw new ConflictException("Reference " + r.code() + " was already migrated or discarded");
        });
        return found;
    }

    private QueueGroup withSuggestions(GroupRow g) {
        ReferenceText text = ReferenceText.parse(g.name());
        String query = text.placeText().isBlank() ? ReferenceText.normalize(g.name()) : text.placeText();
        List<Suggestion> ranked = PlaceSuggester.rank(suggestions.candidates(query, g.lat(), g.lon())).stream()
                .map(c -> new Suggestion(new PlaceRef(places.byId(c.placeId()).code(), c.name()),
                        Math.round(PlaceSuggester.score(c) * SCORE_ROUNDING) / SCORE_ROUNDING))
                .toList();
        return new QueueGroup(g.name(), g.category(), g.codes(), g.lat(), g.lon(),
                text.side() == null ? null : text.side().name(), text.sideUncertain(), ranked);
    }
}
