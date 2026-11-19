package pe.edu.pucp.hesperides.modules.planning.sets.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.SectorSections;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ZoneOption;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Las secciones que se pueden poner en un conjunto, agrupadas por sector, en una sola
 * consulta. Antes salían de la API de turnos de riego, que ya no existe (SPEC-113 D-08).
 */
@Repository
@RequiredArgsConstructor
public class SectionOptionQueries {

    private final NamedParameterJdbcTemplate jdbc;

    public List<SectorSections> sectorsWithSections() {
        Map<Long, SectorSections> bySector = new LinkedHashMap<>();
        jdbc.query("""
                SELECT p.id sector_id, p.code sector_code, p.name sector_name, z.id, z.code, z.name
                FROM zones p
                JOIN catalog_items pt ON pt.id = p.zone_type_item_id AND pt.code = 'SECTOR'
                LEFT JOIN zones z ON z.parent_zone_id = p.id AND z.is_active AND z.deleted_at IS NULL
                     AND z.zone_type_item_id = (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION')
                WHERE p.is_active AND p.deleted_at IS NULL
                ORDER BY p.name, z.name""", Map.of(), rs -> {
            String code = rs.getString("sector_code");
            String name = rs.getString("sector_name");
            SectorSections sector = bySector.computeIfAbsent(rs.getLong("sector_id"),
                    id -> new SectorSections(id, code, name, new ArrayList<>()));
            Long sectionId = rs.getObject("id", Long.class);
            if (sectionId != null) {
                sector.sections().add(new ZoneOption(sectionId, rs.getString("code"), rs.getString("name")));
            }
        });
        return List.copyOf(bySector.values());
    }
}
