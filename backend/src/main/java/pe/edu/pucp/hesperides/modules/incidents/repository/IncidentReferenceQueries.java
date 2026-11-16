package pe.edu.pucp.hesperides.modules.incidents.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.OrganizationResponse;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.ZoneResponse;

import java.util.Optional;

/** Zonas, organizaciones y contactos que una incidencia cita por id, leídos sin JPA. */
@Repository @RequiredArgsConstructor
public class IncidentReferenceQueries {
    private final JdbcTemplate jdbc;

    public Optional<ZoneResponse> zone(Long id) {
        if (id == null) return Optional.empty();
        return jdbc.query("SELECT id,code,name FROM zones WHERE id=? AND deleted_at IS NULL",
                (r, n) -> new ZoneResponse(r.getLong("id"), r.getString("code"), r.getString("name")), id).stream().findFirst();
    }

    public Optional<OrganizationResponse> organization(Long id) {
        if (id == null) return Optional.empty();
        return jdbc.query("SELECT id,name FROM organizations WHERE id=? AND deleted_at IS NULL",
                (r, n) -> new OrganizationResponse(r.getLong("id"), r.getString("name")), id).stream().findFirst();
    }

    /** Un tercero es una empresa externa del Directorio (SPEC-106, `EXTERNAL_COMPANY`). */
    public boolean isExternalCompany(Long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM organizations o JOIN catalog_items t ON t.id=o.type_item_id
             WHERE o.id=? AND o.deleted_at IS NULL AND t.code='EXTERNAL_COMPANY')
            """, Boolean.class, id));
    }

    public Optional<String> contactName(Long id) {
        if (id == null) return Optional.empty();
        return jdbc.query("SELECT full_name FROM contacts WHERE id=? AND deleted_at IS NULL",
                (r, n) -> r.getString(1), id).stream().findFirst();
    }

    /** Punto dentro de la sección, no su centroide, que puede caer fuera del polígono (§3.10). */
    public Optional<double[]> pointInside(Long zoneId) {
        if (zoneId == null) return Optional.empty();
        return jdbc.query("""
            SELECT ST_Y(p) lat, ST_X(p) lng FROM (SELECT ST_PointOnSurface(boundary) p FROM zones
             WHERE id=? AND boundary IS NOT NULL AND deleted_at IS NULL) s
            """, (r, n) -> new double[]{r.getDouble("lat"), r.getDouble("lng")}, zoneId).stream().findFirst();
    }
}
