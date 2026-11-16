package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.LinkedInterventionResponse;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentInterventionLink;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentInterventionLinksRepository;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionQueriesRepository;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionsRepository;
import pe.edu.pucp.hesperides.modules.interventions.service.InterventionAccess;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.util.ArrayList;
import java.util.List;

/** Lee el estado real del trabajo vinculado; la incidencia nunca lo deduce ni lo fabrica. */
@Component @RequiredArgsConstructor
public class IncidentWorkLinks {
    private static final String UNAVAILABLE = "UNAVAILABLE";
    private final IncidentInterventionLinksRepository links;
    private final InterventionsRepository interventions;
    private final InterventionQueriesRepository queries;
    private final InterventionAccess access;

    public List<IncidentInterventionLink> live(Long incidentId) {
        return links.findByIncidentIdAndDeletedAtIsNullOrderByIdAsc(incidentId);
    }

    /** Estados para la regla de cierre: todos los vínculos, aunque quien mira no vea el trabajo. */
    public List<String> statusCodes(Long incidentId) {
        return live(incidentId).stream().map(this::statusCode).toList();
    }

    /** Lo que ve cada persona: el trabajo fuera de su alcance no aparece (salvo a coordinación). */
    public List<LinkedInterventionResponse> visible(Long incidentId, User user) {
        var result = new ArrayList<LinkedInterventionResponse>();
        for (var link : live(incidentId)) {
            var work = queries.detail(link.getIntervention().getId()).orElse(null);
            if (work == null) {
                if (IncidentRoles.manages(user.getRoleCode())) result.add(unavailable(link));
                continue;
            }
            if (!access.canRead(user, work.getTeamId(), work.getAssignedToUserId())) continue;
            result.add(new LinkedInterventionResponse(link.getId(), work.getId(), work.getCode(), work.getDescription(),
                    work.getStatusCode(), work.getLocationCount(), work.getValidatedLocationCount()));
        }
        return result;
    }

    /** Bloquea el trabajo vinculado en orden de id, para no cerrar sobre una validación en curso. */
    public void lockAll(Long incidentId) {
        live(incidentId).stream().map(l -> l.getIntervention().getId()).sorted().forEach(id ->
                interventions.findForUpdate(id).orElseThrow(() -> new BusinessRuleException("Linked intervention is unavailable")));
    }

    private String statusCode(IncidentInterventionLink link) {
        return queries.detail(link.getIntervention().getId()).map(w -> w.getStatusCode()).orElse(UNAVAILABLE);
    }

    private static LinkedInterventionResponse unavailable(IncidentInterventionLink link) {
        return new LinkedInterventionResponse(link.getId(), link.getIntervention().getId(), null, null, UNAVAILABLE, 0, 0);
    }
}
