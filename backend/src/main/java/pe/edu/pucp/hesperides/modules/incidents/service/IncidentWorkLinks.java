package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.repository.*;
import pe.edu.pucp.hesperides.modules.interventions.repository.*;
import pe.edu.pucp.hesperides.modules.interventions.service.InterventionAccess;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;
import java.util.*;

/** Reads real work status; never promotes historical incident tasks to validated work. */
@Component @RequiredArgsConstructor
public class IncidentWorkLinks {
    private final IncidentInterventionLinksRepository links;
    private final IncidentInterventionsRepository legacy;
    private final InterventionsRepository interventions;
    private final InterventionQueriesRepository queries;
    private final InterventionAccess access;
    private final JdbcTemplate jdbc;

    public List<LinkedInterventionResponse> all(Long incidentId) { return read(incidentId, null); }
    public List<LinkedInterventionResponse> visible(Long incidentId, User user) { return read(incidentId, user); }
    private List<LinkedInterventionResponse> read(Long id, User user) {
        var result = new ArrayList<LinkedInterventionResponse>();
        for (var link : links.findByIncidentIdAndDeletedAtIsNullOrderByIdAsc(id)) {
            var work = queries.detail(link.getIntervention().getId()).orElse(null);
            if (work == null) {
                if (user == null || user.getRoleCode().equals("COORDINADOR")) result.add(new LinkedInterventionResponse(link.getId(),
                        link.getIntervention().getId(), null, null, "UNAVAILABLE", 0,
                        new OptionResponse(link.getPurpose().getId(),link.getPurpose().getCode(),link.getPurpose().getLabel()),0,0));
                continue;
            }
            if (user != null && !access.canRead(user, work.getTeamId(), work.getAssignedToUserId())) continue;
            result.add(new LinkedInterventionResponse(link.getId(), work.getId(), work.getCode(), work.getDescription(),
                    work.getStatusCode(), work.getVersion(), new OptionResponse(link.getPurpose().getId(),
                    link.getPurpose().getCode(),link.getPurpose().getLabel()),work.getLocationCount(),work.getValidatedLocationCount()));
        }
        return result;
    }
    public boolean ready(Long id) {
        var linked = all(id);
        if (linked.isEmpty() || linked.stream().anyMatch(w -> !w.statusCode().equals("VALIDATED"))) return false;
        Set<Long> ids = new HashSet<>(linked.stream().map(LinkedInterventionResponse::id).toList());
        return legacy.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                .allMatch(w -> w.getReplacementInterventionId() != null && ids.contains(w.getReplacementInterventionId()));
    }
    public void lockRequired(Long id) {
        var ids = links.findByIncidentIdAndDeletedAtIsNullOrderByIdAsc(id).stream()
                .map(l -> l.getIntervention().getId()).sorted().toList();
        for (Long workId : ids) interventions.findForUpdate(workId)
                .orElseThrow(() -> new BusinessRuleException("Linked intervention is unavailable"));
    }
    public long countWork(boolean validatedOnly, boolean pendingOnly) {
        String state = validatedOnly ? "a.status_code='VALIDATED'" : pendingOnly ? "a.status_code<>'VALIDATED'"
                : "a.status_code IN ('COMPLETED','VALIDATED')";
        return jdbc.queryForObject("SELECT count(DISTINCT i.id) " + InterventionQueriesRepository.FROM + " WHERE i.deleted_at IS NULL AND "
                + state + " AND EXISTS(SELECT 1 FROM incident_intervention_links l JOIN incidents c ON c.id=l.incident_id "
                + "WHERE l.intervention_id=i.id AND l.deleted_at IS NULL AND c.deleted_at IS NULL AND c.approved_at IS NOT NULL"
                + (pendingOnly ? " AND c.resolved_at IS NULL" : "") + ")", Long.class);
    }
    public Page<LinkedInterventionResponse> candidates(String search, int page) {
        int number = Math.max(0, page), size = 20;
        String pattern = LikePattern.contains(search == null ? "" : search.trim().toLowerCase(Locale.ROOT));
        String where = " WHERE i.deleted_at IS NULL AND a.status_code<>'CANCELLED' AND "
                + "(lower(i.code) LIKE ? ESCAPE '\\' OR lower(coalesce(i.description,'')) LIKE ? ESCAPE '\\')";
        Long count = jdbc.queryForObject("SELECT count(*) " + InterventionQueriesRepository.FROM + where, Long.class,pattern,pattern);
        var rows = jdbc.query("SELECT i.id,i.code,i.description,i.version,a.status_code,a.location_count,a.validated_location_count "
                + InterventionQueriesRepository.FROM + where + " ORDER BY i.created_at DESC,i.id DESC LIMIT ? OFFSET ?",
                (r,n) -> new LinkedInterventionResponse(null,r.getLong("id"),r.getString("code"),r.getString("description"),
                        r.getString("status_code"),r.getLong("version"),null,r.getInt("location_count"),r.getInt("validated_location_count")),
                pattern,pattern,size,(long)number*size);
        return new PageImpl<>(rows,PageRequest.of(number,size),count);
    }
}
