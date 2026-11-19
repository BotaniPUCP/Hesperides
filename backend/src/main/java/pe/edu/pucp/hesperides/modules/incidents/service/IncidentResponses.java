package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentReferenceQueries;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

import java.time.Instant;
import java.util.List;

import static pe.edu.pucp.hesperides.modules.incidents.service.IncidentCatalogs.option;

/** Convierte una incidencia en su respuesta HTTP, con nombres y plazo resueltos. */
@Component @RequiredArgsConstructor
public class IncidentResponses {
    private final IncidentReferenceQueries references;
    private final IncidentDeadlines deadlines;

    public IncidentResponse of(Incident i) {
        return new IncidentResponse(i.getId(), i.getCode(), i.getTitle(), i.getOriginalDescription(), i.getDescription(),
                option(i.getReportedUrgency()), option(i.getUrgency()), option(i.getIncidentType()), option(i.getStatus()),
                i.isActive(), references.zone(i.getZoneId()).orElse(null), i.getLocationReference(),
                i.getLatitude(), i.getLongitude(), team(i.getTeam()), i.isThirdParty(),
                references.organization(i.getProviderOrganizationId()).orElse(null), i.getAgreedDays(),
                i.getHeightClass(), requester(i), references.organization(i.getRequestedForOrganizationId()).orElse(null),
                option(i.getSource()), i.getExternalCode(), person(i.getReportedBy()), person(i.getActivatedBy()),
                i.getActivatedAt(), person(i.getClosedBy()), i.getClosedAt(), i.getResolutionSummary(),
                deadlines.of(i, Instant.now()), i.getCreatedAt(), i.getVersion(), List.copyOf(i.getEditedFields()));
    }

    public IncidentRefResponse ref(Incident i) {
        return new IncidentRefResponse(i.getId(), i.getCode(), i.getTitle(), i.getStatus().getCode(), i.isActive());
    }

    private RequesterResponse requester(Incident i) {
        var organization = references.organization(i.getRequestedByOrganizationId());
        return new RequesterResponse(organization.map(OrganizationResponse::code).orElse(null),
                organization.map(OrganizationResponse::name).orElse(null), i.getRequestedByName(),
                references.contactCode(i.getRequesterContactId()).orElse(null),
                references.contactName(i.getRequesterContactId()).orElse(null));
    }

    static PersonResponse person(User user) {
        return user == null ? null : new PersonResponse(user.getId(), user.getFullName());
    }

    static TeamResponse team(Team team) {
        return team == null ? null : new TeamResponse(team.getId(), team.getName());
    }
}
