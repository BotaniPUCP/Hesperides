package pe.edu.pucp.hesperides.modules.irrigation.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** zones todavía no tiene entidad JPA. SQL parametrizado sobre el catálogo existente. */
@Repository
@RequiredArgsConstructor
public class IrrigationZoneQueries {
    private final JdbcTemplate jdbc;

    /**
     * Qué es «una sección de un sector»: la regla la comparten riego y reportes
     * (SPEC-202 §2.1), así que vive una sola vez.
     */
    private static final String SECTIONS_OF_SECTOR = """
        FROM zones z
        JOIN catalog_items ci ON ci.id = z.zone_type_item_id
        JOIN catalog_types ct ON ct.id = ci.catalog_type_id
        WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION'
          AND z.parent_zone_id = ? AND z.is_active = TRUE AND z.deleted_at IS NULL
        ORDER BY z.name
        """;

    /** Una sección con su superficie; la superficie es nula si el mapa no la trae. */
    public record SectionWithArea(Long id, String code, String name, BigDecimal areaM2) {
    }

    public record SectionIrrigation(Long id, String code, String name, String sectorName,
                                    BigDecimal areaM2, LocalDate lastIrrigatedOn) {}

    public List<SectionIrrigation> activeGreenSectionsWithLastIrrigation(LocalDate asOf) {
        return jdbc.query("""
            WITH latest AS (
                SELECT ts.section_zone_id, t.sector_zone_id, MAX(t.irrigation_date) AS last_irrigated_on
                FROM irrigation_turns t
                JOIN irrigation_turn_sections ts ON ts.turn_id = t.id AND ts.deleted_at IS NULL
                WHERE t.deleted_at IS NULL AND t.irrigation_date <= ?
                GROUP BY ts.section_zone_id, t.sector_zone_id
            )
            SELECT s.id, s.code, s.name, sector.name AS sector_name, s.area_m2, latest.last_irrigated_on
            FROM zones s
            JOIN catalog_items section_type ON section_type.id = s.zone_type_item_id AND section_type.code = 'SECTION'
            JOIN catalog_types section_catalog ON section_catalog.id = section_type.catalog_type_id AND section_catalog.code = 'ZONE_TYPE'
            JOIN catalog_items landscape ON landscape.id = s.landscape_type_item_id AND landscape.code = 'GREEN_AREA'
            JOIN catalog_types landscape_catalog ON landscape_catalog.id = landscape.catalog_type_id AND landscape_catalog.code = 'LANDSCAPE_TYPE'
            JOIN zones sector ON sector.id = s.parent_zone_id AND sector.is_active AND sector.deleted_at IS NULL
            JOIN catalog_items sector_type ON sector_type.id = sector.zone_type_item_id AND sector_type.code = 'SECTOR'
            JOIN catalog_types sector_catalog ON sector_catalog.id = sector_type.catalog_type_id AND sector_catalog.code = 'ZONE_TYPE'
            LEFT JOIN latest ON latest.section_zone_id = s.id AND latest.sector_zone_id = sector.id
            WHERE s.is_active AND s.deleted_at IS NULL
            ORDER BY latest.last_irrigated_on NULLS FIRST, s.name, s.id
            """, (rs, n) -> new SectionIrrigation(rs.getLong("id"), rs.getString("code"),
                rs.getString("name"), rs.getString("sector_name"), rs.getBigDecimal("area_m2"),
                rs.getObject("last_irrigated_on", LocalDate.class)), asOf);
    }

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
        return jdbc.query("SELECT z.id, z.code, z.name " + SECTIONS_OF_SECTOR,
            (rs, n) -> new IrrigationZoneResponse(
                rs.getLong("id"), rs.getString("code"), rs.getString("name")), sectorId);
    }

    /** Historical turns keep their recorded sections when a zone moves or becomes inactive. */
    public List<IrrigationZoneResponse> recordedSections(Long turnId) {
        return jdbc.query("""
            SELECT z.id, z.code, z.name FROM irrigation_turn_sections ts
            JOIN zones z ON z.id = ts.section_zone_id
            WHERE ts.turn_id = ? AND ts.deleted_at IS NULL
            ORDER BY z.name
            """, (rs, n) -> new IrrigationZoneResponse(
                rs.getLong("id"), rs.getString("code"), rs.getString("name")), turnId);
    }

    /** Misma regla que {@link #sectionsOf(Long)}, con la superficie que necesitan los reportes. */
    public List<SectionWithArea> sectionsWithAreaOf(Long sectorId) {
        return jdbc.query("SELECT z.id, z.code, z.name, z.area_m2 " + SECTIONS_OF_SECTOR,
            (rs, n) -> new SectionWithArea(rs.getLong("id"), rs.getString("code"),
                rs.getString("name"), rs.getBigDecimal("area_m2")), sectorId);
    }

    public List<Long> activeSectorsOfSupervisor(Long userId) {
        return jdbc.query("""
            SELECT DISTINCT t.zone_id FROM teams t
            WHERE t.supervisor_user_id = ? AND t.zone_id IS NOT NULL
              AND t.is_active = TRUE AND t.deleted_at IS NULL
            """, (rs, n) -> rs.getLong(1), userId);
    }
}
