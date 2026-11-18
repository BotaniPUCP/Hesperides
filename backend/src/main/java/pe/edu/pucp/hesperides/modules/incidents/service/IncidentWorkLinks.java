package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.InterventionCandidateResponse;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.LinkedInterventionResponse;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentInterventionLink;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentInterventionLinksRepository;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionQueriesRepository;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionsRepository;
import pe.edu.pucp.hesperides.modules.interventions.service.InterventionAccess;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbc;

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

    /** Todas las intervenciones no canceladas, las más nuevas primero: se buscan en el navegador (SPEC-119). */
    public List<InterventionCandidateResponse> candidates() {
        return jdbc.query("SELECT i.id,i.code,i.description,a.status_code,"
                + "unaccent(lower(concat_ws(' ',i.code,i.description))) AS search_key "
                + InterventionQueriesRepository.FROM + " WHERE i.deleted_at IS NULL AND a.status_code<>'CANCELLED'"
                + " ORDER BY i.created_at DESC, i.id DESC",
                (r, n) -> new InterventionCandidateResponse(r.getLong("id"), r.getString("code"), r.getString("description"),
                        r.getString("status_code"), r.getString("search_key")));
    }

    private String statusCode(IncidentInterventionLink link) {
        return queries.detail(link.getIntervention().getId()).map(w -> w.getStatusCode()).orElse(UNAVAILABLE);
    }

    private static LinkedInterventionResponse unavailable(IncidentInterventionLink link) {
        return new LinkedInterventionResponse(link.getId(), link.getIntervention().getId(), null, null, UNAVAILABLE, 0, 0);
    }
}
