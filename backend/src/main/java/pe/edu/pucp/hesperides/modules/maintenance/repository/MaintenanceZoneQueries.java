package pe.edu.pucp.hesperides.modules.maintenance.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ZoneOptionResponse;

import java.util.List;

/**
 * Las secciones que pueden ser ámbito de una frecuencia. {@code zones} todavía no
 * tiene entidad JPA, y {@code maintenance_frequencies.zone_id} no lleva clave
 * foránea: por eso la existencia de la sección se comprueba aquí.
 */
@Repository
@RequiredArgsConstructor
public class MaintenanceZoneQueries {

    private final JdbcTemplate jdbc;

    public List<ZoneOptionResponse> activeSections() {
        return jdbc.query("""
                SELECT s.id, s.code, s.name, p.id AS sector_id, p.name AS sector_name
                FROM zones s
                JOIN catalog_items ci ON ci.id = s.zone_type_item_id
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                LEFT JOIN zones p ON p.id = s.parent_zone_id
                WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION'
                  AND s.is_active = TRUE AND s.deleted_at IS NULL
                ORDER BY p.name, s.name
                """, (rs, n) -> new ZoneOptionResponse(
                rs.getLong("id"), rs.getString("code"), rs.getString("name"),
                rs.getObject("sector_id", Long.class), rs.getString("sector_name")));
    }

    public boolean isActiveSection(Long zoneId) {
        Integer found = jdbc.queryForObject("""
                SELECT COUNT(*) FROM zones s
                JOIN catalog_items ci ON ci.id = s.zone_type_item_id
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE s.id = ? AND ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION'
                  AND s.is_active = TRUE AND s.deleted_at IS NULL
                """, Integer.class, zoneId);
        return found != null && found > 0;
    }
}
