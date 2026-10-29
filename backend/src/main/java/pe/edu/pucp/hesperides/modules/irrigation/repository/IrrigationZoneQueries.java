package pe.edu.pucp.hesperides.modules.irrigation.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;

import java.util.List;

/** zones todavía no tiene entidad JPA. SQL parametrizado sobre el catálogo existente. */
@Repository
@RequiredArgsConstructor
public class IrrigationZoneQueries {
    private final JdbcTemplate jdbc;

    public List<IrrigationZoneResponse> sectors() {
        return jdbc.query("""
            SELECT z.id, z.code, z.name FROM zones z
            JOIN catalog_items ci ON ci.id = z.zone_type_item_id
            JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTOR'
              AND z.is_active = TRUE AND z.deleted_at IS NULL
            ORDER BY z.name
            """, (rs, n) -> new IrrigationZoneResponse(
                rs.getLong("id"), rs.getString("code"), rs.getString("name")));
    }

    public List<IrrigationZoneResponse> sectionsOf(Long sectorId) {
        return jdbc.query("""
            SELECT z.id, z.code, z.name FROM zones z
            JOIN catalog_items ci ON ci.id = z.zone_type_item_id
            JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION'
              AND z.parent_zone_id = ? AND z.is_active = TRUE AND z.deleted_at IS NULL
            ORDER BY z.name
            """, (rs, n) -> new IrrigationZoneResponse(
                rs.getLong("id"), rs.getString("code"), rs.getString("name")), sectorId);
    }

    public List<Long> activeSectorsOfSupervisor(Long userId) {
        return jdbc.query("""
            SELECT DISTINCT t.zone_id FROM teams t
            WHERE t.supervisor_user_id = ? AND t.zone_id IS NOT NULL
              AND t.is_active = TRUE AND t.deleted_at IS NULL
            """, (rs, n) -> rs.getLong(1), userId);
    }
}
