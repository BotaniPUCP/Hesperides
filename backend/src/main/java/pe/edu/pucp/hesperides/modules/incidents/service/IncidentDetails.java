package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.PrefillAdvice;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.*;

import java.util.List;

import static pe.edu.pucp.hesperides.modules.incidents.service.IncidentCatalogs.option;
import static pe.edu.pucp.hesperides.modules.incidents.service.IncidentResponses.person;

/** El detalle de una incidencia para quien la mira, con lo que puede hacer en ella. */
@Component @RequiredArgsConstructor
public class IncidentDetails {
    private final IncidentResponses responses;
    private final IncidentRules rules;
    private final IncidentWorkLinks workLinks;
    private final IncidentAccess access;
    private final IncidentsRepository incidents;
    private final IncidentHistoryRepository history;
    private final IncidentPhotosRepository photos;
    private final IncidentUpdatesRepository updates;

    public DetailResponse of(Incident incident, User actor) {
        Long id = incident.getId();
        var blockers = rules.closureBlockers(incident).stream().map(Enum::name).toList();
        return new DetailResponse(responses.of(incident), prefill(incident),
                workLinks.visible(id, actor), blockers,
                rules.activationGaps(incident).stream().map(Enum::name).toList(), similar(incident),
                history.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                        .map(h -> new HistoryResponse(h.getId(), option(h.getStatus()), person(h.getChangedBy()), h.getCreatedAt())).toList(),
                photos.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                        .map(p -> new PhotoResponse(p.getId(), p.getContentType(), p.getSizeBytes(), p.getCreatedAt())).toList(),
                updates.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                        .map(u -> new UpdateResponse(u.getId(), person(u.getAuthor()), option(u.getKind()), u.getBody(), u.getCreatedAt())).toList(),
                capabilities(incident, actor, blockers.isEmpty()));
    }

    private PrefillResponse prefill(Incident incident) {
        PrefillAdvice advice = rules.advice(incident);
        return new PrefillResponse(incident.getPrefillStatus(), incident.getPrefillSuggestion(),
                advice == null ? null : advice.suggestedUrgencyCode(), advice != null && advice.thirdParty(),
                advice == null ? List.of() : advice.warnings().stream().map(Enum::name).toList(), incident.getPrefillUpdatedAt());
    }

    private List<SimilarCaseResponse> similar(Incident incident) {
        if (incident.getIncidentType() == null) return List.of();
        return incidents.findTop3ByIncidentTypeIdAndIdNotAndClosedAtIsNotNullAndResolutionSummaryIsNotNullAndDeletedAtIsNullOrderByClosedAtDesc(
                        incident.getIncidentType().getId(), incident.getId()).stream()
                .map(c -> new SimilarCaseResponse(c.getId(), c.getCode(), c.getTitle(), c.getResolutionSummary())).toList();
    }

    private CapabilitiesResponse capabilities(Incident incident, User actor, boolean closable) {
        boolean manages = access.manages(actor);
        boolean open = !incident.isClosed();
        boolean own = incident.getReportedBy().getId().equals(actor.getId());
        return new CapabilitiesResponse(manages && open, manages && open && !incident.isActive(),
                manages && open && incident.isActive(), manages && open && closable,
                manages && open && !"PENDING".equals(incident.getPrefillStatus()),
                open, open && (manages || own || "SUPERVISOR".equals(actor.getRoleCode())));
    }
}
