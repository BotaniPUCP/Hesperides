package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.ZoneResponse;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentReferenceQueries;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.Choice;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.PrefillRequest;

import java.util.List;

/**
 * Lo que se le manda al agente. Solo el texto, la gravedad y la ubicación: nunca el reportante,
 * «Pedido de», contactos ni fotos (SPEC-201 §3.4, anti-meta de §2.3).
 */
@Component @RequiredArgsConstructor
public class IncidentPrefillInputs {
    private final IncidentReferenceQueries references;
    private final IncidentCatalogs catalogs;
    private final JdbcTemplate jdbc;

    public PrefillRequest of(Incident incident) {
        String zone = references.zone(incident.getZoneId()).map(ZoneResponse::name).orElse(null);
        return new PrefillRequest(incident.getOriginalDescription(), IncidentCatalogs.code(incident.getReportedUrgency()),
                incident.getLocationReference(), zone, sections(), types());
    }

    /** Las secciones van por id como código, para que la respuesta se pueda resolver sin ambigüedad. */
    private List<Choice> sections() {
        return jdbc.query("""
            SELECT z.id, z.name FROM zones z JOIN catalog_items t ON t.id=z.zone_type_item_id
             WHERE z.deleted_at IS NULL AND z.is_active AND t.code='SECTION' ORDER BY z.name
            """, (r, n) -> new Choice(String.valueOf(r.getLong("id")), r.getString("name")));
    }

    private List<Choice> types() {
        return catalogs.active(IncidentCatalogs.TYPE).stream().map(t -> new Choice(t.getCode(), t.getLabel())).toList();
    }
}
