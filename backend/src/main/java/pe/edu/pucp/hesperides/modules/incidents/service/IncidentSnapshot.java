package pe.edu.pucp.hesperides.modules.incidents.service;

import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * Valores editables de una incidencia, para saber qué cambió una persona: esos campos quedan
 * marcados como «Editado» y el agente ya no puede llenarlos (SPEC-201 §3.4).
 */
final class IncidentSnapshot {
    private IncidentSnapshot() {
    }

    static Map<String, Object> of(Incident i) {
        var values = new LinkedHashMap<String, Object>();
        values.put("title", i.getTitle());
        values.put("description", i.getDescription());
        values.put("urgencyCode", IncidentCatalogs.code(i.getUrgency()));
        values.put("typeCode", IncidentCatalogs.code(i.getIncidentType()));
        values.put("zoneId", i.getZoneId());
        values.put("reference", i.getLocationReference());
        values.put("latitude", i.getLatitude());
        values.put("longitude", i.getLongitude());
        values.put("teamId", i.getTeam() == null ? null : i.getTeam().getId());
        values.put("thirdParty", i.isThirdParty());
        values.put("providerOrganizationId", i.getProviderOrganizationId());
        values.put("agreedDays", i.getAgreedDays());
        values.put("heightClass", i.getHeightClass());
        values.put("requestedByOrganizationId", i.getRequestedByOrganizationId());
        values.put("requestedByName", i.getRequestedByName());
        values.put("requesterContactId", i.getRequesterContactId());
        values.put("requestedForOrganizationId", i.getRequestedForOrganizationId());
        values.put("sourceCode", IncidentCatalogs.code(i.getSource()));
        values.put("externalCode", i.getExternalCode());
        return values;
    }

    static Set<String> changed(Map<String, Object> before, Map<String, Object> after) {
        var fields = new TreeSet<String>();
        after.forEach((field, value) -> {
            if (!Objects.equals(before.get(field), value)) fields.add(field);
        });
        return fields;
    }
}
