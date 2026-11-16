package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentReferenceQueries;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Objects;

/** Ubicación y «Pedido de» / «Para», validados igual al capturar y al revisar (SPEC-201 §3.2-§3.3). */
@Component @RequiredArgsConstructor
public class IncidentFields {
    private final IncidentReferenceQueries references;

    public void applyLocation(Incident incident, Long zoneId, String reference, Double latitude, Double longitude) {
        requireCoordinates(latitude, longitude);
        if (zoneId != null && references.zone(zoneId).isEmpty()) throw new ValidationException("Invalid zone");
        incident.setZoneId(zoneId);
        incident.setLocationReference(clean(reference));
        incident.setLatitude(latitude);
        incident.setLongitude(longitude);
    }

    public void applyRequester(Incident incident, String byCode, String byName, String contactCode, String forCode) {
        Long byOrganization = organization(byCode);
        Long forOrganization = organization(forCode);
        Long contact = contactCode == null || contactCode.isBlank() ? null
                : references.contactId(contactCode).orElseThrow(() -> new ValidationException("Invalid contact"));
        if (byOrganization == null && clean(byName) == null) throw new ValidationException("Requester required");
        if (forOrganization != null && Objects.equals(forOrganization, byOrganization)) {
            throw new ValidationException("Requested for must differ from requested by");
        }
        incident.setRequestedByOrganizationId(byOrganization);
        incident.setRequestedByName(clean(byName));
        incident.setRequesterContactId(contact);
        incident.setRequestedForOrganizationId(forOrganization);
    }

    /** Una organización del Directorio por su código; uno desconocido es un 400. */
    public Long organization(String code) {
        if (code == null || code.isBlank()) return null;
        return references.organizationId(code).orElseThrow(() -> new ValidationException("Invalid organization"));
    }

    private static void requireCoordinates(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)) throw new ValidationException("Invalid coordinates");
        if (latitude != null && (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)) {
            throw new ValidationException("Invalid coordinates");
        }
    }

    public static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
