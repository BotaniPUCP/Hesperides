package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.HeightClass;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.ReviewIncidentRequest;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentReferenceQueries;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Aplica la revisión de coordinación a una incidencia, validando cada referencia. */
@Component @RequiredArgsConstructor
public class IncidentReviewFields {
    private final IncidentCatalogs catalogs;
    private final IncidentFields fields;
    private final IncidentReferenceQueries references;
    private final TeamsRepository teams;

    public void apply(Incident incident, ReviewIncidentRequest r) {
        incident.setTitle(IncidentFields.clean(r.title()));
        incident.setDescription(r.description().trim());
        incident.setUrgency(catalogs.optional(IncidentCatalogs.URGENCY, r.urgencyCode()));
        incident.setIncidentType(catalogs.optional(IncidentCatalogs.TYPE, r.typeCode()));
        fields.applyLocation(incident, r.zoneId(), r.locationReference(), r.latitude(), r.longitude());
        incident.setTeam(r.teamId() == null ? null : teams.findById(r.teamId())
                .filter(t -> t.isActive() && !t.isDeleted()).orElseThrow(() -> new ValidationException("Invalid team")));
        applyAttention(incident, r);
        incident.setHeightClass(heightClass(r.heightClass()));
        fields.applyRequester(incident, r.requestedByOrganizationCode(), r.requestedByName(),
                r.requesterContactCode(), r.requestedForOrganizationCode());
        incident.setSource(catalogs.optional(IncidentCatalogs.SOURCE, r.sourceCode()));
        incident.setExternalCode(IncidentFields.clean(r.externalCode()));
    }

    /** El tercero es una empresa externa del Directorio, solo como dato informativo (§3.6). */
    private void applyAttention(Incident incident, ReviewIncidentRequest r) {
        Long provider = fields.organization(r.providerOrganizationCode());
        if (provider != null && !references.isExternalCompany(provider)) {
            throw new ValidationException("Provider must be an external company");
        }
        incident.setThirdParty(r.thirdParty());
        incident.setProviderOrganizationId(r.thirdParty() ? provider : null);
        incident.setAgreedDays(r.thirdParty() ? r.agreedDays() : null);
    }

    private static String heightClass(String code) {
        if (code == null || code.isBlank()) return null;
        try {
            return HeightClass.fromCode(code).name();
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Invalid height class");
        }
    }
}
