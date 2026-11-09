package pe.edu.pucp.hesperides.modules.planning.sets.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ActivityRef;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ZoneRef;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Secciones y actividades de un conjunto. Se reemplazan enteras al editar (baja
 * lógica de las anteriores) porque una fila de pertenencia no tiene identidad.
 */
@Repository
@RequiredArgsConstructor
public class GreenAreaSetQueries {

    /** Una sección del conjunto que ya sigue otra regla propia de la misma actividad (D-08). */
    public record OwnRuleOverlap(String zoneName, String activityLabel, String otherSetName) {
    }

    private static final String ACTIVE_SECTION = """
            SELECT z.id FROM zones z JOIN catalog_items ci ON ci.id = z.zone_type_item_id
            JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION' AND z.is_active AND z.deleted_at IS NULL""";

    private final NamedParameterJdbcTemplate jdbc;

    public List<Long> nonSections(Collection<Long> ids) {
        return jdbc.queryForList("SELECT id FROM unnest(CAST(:ids AS bigint[])) AS id WHERE id NOT IN ("
                + ACTIVE_SECTION + ") ORDER BY id", Map.of("ids", ids.toArray(Long[]::new)), Long.class);
    }

    public List<Long> invalidActivities(Collection<Long> ids) {
        return jdbc.queryForList("""
                SELECT id FROM unnest(CAST(:ids AS bigint[])) AS id WHERE id NOT IN (
                  SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                  WHERE ct.code = 'INTERVENTION_TYPE' AND ci.is_active AND ci.deleted_at IS NULL) ORDER BY id""",
                Map.of("ids", ids.toArray(Long[]::new)), Long.class);
    }

    /** {@code displayName}: el lugar más antiguo cuyo contorno es la sección, si existe. */
    public List<ZoneRef> zonesOf(long setId) {
        return jdbc.query("""
                SELECT z.id, z.code, z.name, COALESCE(p.name, z.name) AS display_name,
                       landscape.code AS landscape_code, sector.name AS sector_name
                FROM green_area_set_zones gz JOIN zones z ON z.id = gz.zone_id AND z.deleted_at IS NULL AND z.is_active
                LEFT JOIN catalog_items landscape ON landscape.id = z.landscape_type_item_id
                LEFT JOIN zones sector ON sector.id = z.parent_zone_id
                LEFT JOIN LATERAL (SELECT name FROM places WHERE zone_id = z.id AND deleted_at IS NULL
                                   ORDER BY id LIMIT 1) p ON TRUE
                WHERE gz.set_id = :set AND gz.deleted_at IS NULL ORDER BY display_name""",
                Map.of("set", setId), (rs, n) -> new ZoneRef(rs.getLong("id"), rs.getString("code"),
                        rs.getString("name"), rs.getString("display_name"), rs.getString("landscape_code"),
                        rs.getString("sector_name")));
    }

    public List<ActivityRef> activitiesOf(long setId) {
        return jdbc.query("""
                SELECT ci.id, ci.label FROM green_area_set_activities ga JOIN catalog_items ci ON ci.id = ga.activity_type_item_id
                WHERE ga.set_id = :set AND ga.deleted_at IS NULL ORDER BY ci.label""",
                Map.of("set", setId), (rs, n) -> new ActivityRef(rs.getLong("id"), rs.getString("label")));
    }

    /** Secciones activas por conjunto: una sección dada de baja no cuenta (Review Focus 5). */
    public Map<Long, Integer> activeZoneCounts() {
        var counts = new java.util.HashMap<Long, Integer>();
        jdbc.query("""
                SELECT gz.set_id, COUNT(*) AS n FROM green_area_set_zones gz
                JOIN zones z ON z.id = gz.zone_id AND z.deleted_at IS NULL AND z.is_active
                WHERE gz.deleted_at IS NULL GROUP BY gz.set_id""",
                rs -> { counts.put(rs.getLong("set_id"), rs.getInt("n")); });
        return counts;
    }

    public void replaceZones(long setId, List<Long> zoneIds) {
        replace("green_area_set_zones", "zone_id", setId, zoneIds);
    }

    public void replaceActivities(long setId, List<Long> activityIds) {
        replace("green_area_set_activities", "activity_type_item_id", setId, activityIds);
    }

    private void replace(String table, String column, long setId, List<Long> ids) {
        var params = Map.of("set", setId, "ids", ids.toArray(Long[]::new));
        jdbc.update("UPDATE " + table + " SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP"
                + " WHERE set_id = :set AND deleted_at IS NULL", params);
        jdbc.update("INSERT INTO " + table + " (set_id, " + column + ") SELECT :set, id FROM unnest(CAST(:ids AS bigint[])) AS id",
                params);
    }

    public boolean hasCurrentOwnRule(long setId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM maintenance_frequencies WHERE green_area_set_id = :set
                  AND valid_to IS NULL AND deleted_at IS NULL)""", Map.of("set", setId), Boolean.class));
    }

    public List<OwnRuleOverlap> overlaps(long setId) {
        return jdbc.query("""
                SELECT DISTINCT z.name AS zone_name, ci.label AS activity, other.name AS other_set
                FROM maintenance_frequencies mine
                JOIN green_area_set_zones gz ON gz.set_id = mine.green_area_set_id AND gz.deleted_at IS NULL
                JOIN green_area_set_zones oz ON oz.zone_id = gz.zone_id AND oz.set_id <> gz.set_id AND oz.deleted_at IS NULL
                JOIN green_area_sets other ON other.id = oz.set_id AND other.deleted_at IS NULL
                JOIN maintenance_frequencies theirs ON theirs.green_area_set_id = other.id
                  AND theirs.activity_type_item_id = mine.activity_type_item_id
                  AND theirs.valid_to IS NULL AND theirs.deleted_at IS NULL
                JOIN zones z ON z.id = gz.zone_id JOIN catalog_items ci ON ci.id = mine.activity_type_item_id
                WHERE mine.green_area_set_id = :set AND mine.valid_to IS NULL AND mine.deleted_at IS NULL
                ORDER BY 1, 2, 3""", Map.of("set", setId),
                (rs, n) -> new OwnRuleOverlap(rs.getString("zone_name"), rs.getString("activity"), rs.getString("other_set")));
    }
}
