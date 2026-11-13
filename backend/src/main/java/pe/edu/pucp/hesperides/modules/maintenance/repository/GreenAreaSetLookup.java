package pe.edu.pucp.hesperides.modules.maintenance.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Lo que el módulo de frecuencias necesita saber de un conjunto de áreas verdes
 * (SPEC-203): si existe, y qué reglas le asigna Planificación. Se lee por SQL para no
 * depender del módulo que administra los conjuntos.
 */
@Repository
@RequiredArgsConstructor
public class GreenAreaSetLookup {

    private final JdbcTemplate jdbc;

    public boolean isActiveSet(Long setId) {
        Integer found = jdbc.queryForObject(
                "SELECT COUNT(*) FROM green_area_sets WHERE id = ? AND deleted_at IS NULL", Integer.class, setId);
        return found != null && found > 0;
    }

    /**
     * Las reglas asignadas a cada sección activa para una actividad, a través de los
     * conjuntos que la contienen: con ellas se elige la regla efectiva (SPEC-203 §5.8).
     */
    public Map<Long, Set<UUID>> assignedRulesByZone(long activityId, Collection<Long> zoneIds) {
        Map<Long, Set<UUID>> out = new HashMap<>();
        if (zoneIds.isEmpty()) return out;
        jdbc.query("""
                SELECT gz.zone_id, pa.frequency_rule_key FROM green_area_set_zones gz
                JOIN green_area_sets s ON s.id = gz.set_id AND s.deleted_at IS NULL
                JOIN zones z ON z.id = gz.zone_id AND z.deleted_at IS NULL AND z.is_active
                JOIN planning_assignments pa ON pa.set_id = gz.set_id AND pa.deleted_at IS NULL
                  AND pa.activity_type_item_id = ? AND pa.frequency_rule_key IS NOT NULL
                WHERE gz.deleted_at IS NULL AND gz.zone_id = ANY(?)""",
                ps -> {
                    ps.setLong(1, activityId);
                    ps.setArray(2, ps.getConnection().createArrayOf("bigint", zoneIds.toArray()));
                },
                rs -> { out.computeIfAbsent(rs.getLong("zone_id"), k -> new HashSet<>())
                        .add(rs.getObject("frequency_rule_key", UUID.class)); });
        return out;
    }

    /** A cuántos conjuntos activos está asignada cada regla. */
    public Map<UUID, Integer> assignedSetCounts(Collection<UUID> ruleKeys) {
        Map<UUID, Integer> out = new HashMap<>();
        if (ruleKeys.isEmpty()) return out;
        jdbc.query("""
                SELECT pa.frequency_rule_key, COUNT(*) AS n FROM planning_assignments pa
                JOIN green_area_sets s ON s.id = pa.set_id AND s.deleted_at IS NULL
                WHERE pa.deleted_at IS NULL AND pa.frequency_rule_key = ANY(?)
                  -- Como la planificación (PlanningSetsQueries): un conjunto que se quedó sin jardines
                  -- ni ejemplares activos no tiene tarjeta, así que no cuenta.
                  AND (EXISTS (SELECT 1 FROM green_area_set_zones gz
                               JOIN zones z ON z.id = gz.zone_id AND z.deleted_at IS NULL AND z.is_active
                               WHERE gz.set_id = s.id AND gz.deleted_at IS NULL)
                    OR EXISTS (SELECT 1 FROM green_area_set_elements ge
                               JOIN green_elements e ON e.id = ge.green_element_id AND e.deleted_at IS NULL AND e.is_active
                               WHERE ge.set_id = s.id AND ge.deleted_at IS NULL))
                GROUP BY pa.frequency_rule_key""",
                ps -> ps.setArray(1, ps.getConnection().createArrayOf("uuid", ruleKeys.toArray())),
                rs -> { out.put(rs.getObject("frequency_rule_key", UUID.class), rs.getInt("n")); });
        return out;
    }

    /** La sección que contorna cada lugar; un lugar sin sección no aparece. */
    public Map<Long, Long> sectionsOfPlaces(Collection<Long> placeIds) {
        Map<Long, Long> out = new HashMap<>();
        if (placeIds.isEmpty()) return out;
        jdbc.query("SELECT id, zone_id FROM places WHERE zone_id IS NOT NULL AND id = ANY(?)",
                ps -> ps.setArray(1, ps.getConnection().createArrayOf("bigint", placeIds.toArray())),
                rs -> { out.put(rs.getLong("id"), rs.getLong("zone_id")); });
        return out;
    }
}
