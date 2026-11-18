package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.engine.incidents.IncidentPrefill;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentReferenceQueries;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

/**
 * Guarda la sugerencia y llena solo los campos vacíos que nadie editó (SPEC-201 §9). Lo que el
 * modelo inventa (un tipo o una sección que no existen) se descarta en vez de guardarse.
 */
@Component @RequiredArgsConstructor
public class IncidentPrefillApplier {
    private final IncidentsRepository incidents;
    private final CatalogItemsRepository catalogs;
    private final IncidentReferenceQueries references;

    public void apply(Long incidentId, AgentSuggestion raw) {
        incidents.lockById(incidentId).filter(IncidentPrefillService::pending).ifPresent(incident -> {
            AgentSuggestion suggestion = withoutUnknowns(raw);
            incident.setPrefillSuggestion(PrefillSuggestions.toMap(suggestion));
            incident.setPrefillStatus("READY");
            incident.setPrefillUpdatedAt(Instant.now());
            fill(incident, suggestion);
            incidents.saveAndFlush(incident);
        });
    }

    private void fill(Incident incident, AgentSuggestion s) {
        var fill = IncidentPrefill.fill(current(incident), new HashSet<>(incident.getEditedFields()), suggested(s));
        if (fill.containsKey("title")) incident.setTitle((String) fill.get("title"));
        if (fill.containsKey("typeCode")) incident.setIncidentType(type(s.typeCode()));
        if (fill.containsKey("zoneId")) incident.setZoneId(s.zoneId());
        if (fill.containsKey("reference")) incident.setLocationReference(s.reference());
        if (fill.containsKey("heightClass")) incident.setHeightClass(s.height().name());
    }

    private static Map<String, Object> current(Incident i) {
        var values = new HashMap<String, Object>();
        values.put("title", i.getTitle());
        values.put("typeCode", IncidentCatalogs.code(i.getIncidentType()));
        values.put("zoneId", i.getZoneId());
        values.put("reference", i.getLocationReference());
        values.put("heightClass", i.getHeightClass());
        return values;
    }

    private static Map<String, Object> suggested(AgentSuggestion s) {
        var values = new HashMap<String, Object>();
        values.put("title", s.title());
        values.put("typeCode", s.typeCode());
        values.put("zoneId", s.zoneId());
        values.put("reference", s.reference());
        values.put("heightClass", s.height().name());
        return values;
    }

    private AgentSuggestion withoutUnknowns(AgentSuggestion s) {
        String typeCode = s.typeCode() != null && type(s.typeCode()) != null ? s.typeCode() : null;
        Long zoneId = s.zoneId() != null && references.zone(s.zoneId()).isPresent() ? s.zoneId() : null;
        return new AgentSuggestion(s.title(), typeCode, zoneId, s.reference(), s.thirdParty(), s.height(),
                s.imminentRisk(), s.imminentReason(), s.plan(), s.justification(), s.confidence());
    }

    private CatalogItem type(String code) {
        return catalogs.findActiveItemByTypeAndCode(IncidentCatalogs.TYPE, code).orElse(null);
    }
}
