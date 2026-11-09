package pe.edu.pucp.hesperides.modules.planning.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Lo que la planificación lee de los conjuntos: sus secciones activas y sus actividades. */
@Repository
@RequiredArgsConstructor
public class PlanningSetsQueries {

    /** Un conjunto activo con solo sus secciones vigentes: una sección dada de baja no cuenta. */
    public record SetSnapshot(long id, String name, Set<Long> zoneIds, Set<Long> activityTypeItemIds) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public List<SetSnapshot> activeSets() {
        Map<Long, String> names = new LinkedHashMap<>();
        Map<Long, Set<Long>> zones = new HashMap<>();
        Map<Long, Set<Long>> activities = new HashMap<>();
        jdbc.query("SELECT id, name FROM green_area_sets WHERE deleted_at IS NULL ORDER BY lower(name)",
                rs -> { names.put(rs.getLong("id"), rs.getString("name")); });
        jdbc.query("""
                SELECT gz.set_id, gz.zone_id FROM green_area_set_zones gz
                JOIN zones z ON z.id = gz.zone_id AND z.deleted_at IS NULL AND z.is_active
                WHERE gz.deleted_at IS NULL""",
                rs -> { zones.computeIfAbsent(rs.getLong("set_id"), k -> new HashSet<>()).add(rs.getLong("zone_id")); });
        jdbc.query("SELECT set_id, activity_type_item_id FROM green_area_set_activities WHERE deleted_at IS NULL",
                rs -> { activities.computeIfAbsent(rs.getLong("set_id"), k -> new HashSet<>())
                        .add(rs.getLong("activity_type_item_id")); });
        return names.entrySet().stream().map(e -> new SetSnapshot(e.getKey(), e.getValue(),
                Set.copyOf(zones.getOrDefault(e.getKey(), Set.of())),
                Set.copyOf(activities.getOrDefault(e.getKey(), Set.of())))).toList();
    }

    /** Nombre de cada actividad: la fila «sin frecuencia configurada» no tiene regla de donde sacarlo. */
    public Map<Long, String> activityLabels(Collection<Long> activityIds) {
        Map<Long, String> out = new HashMap<>();
        if (activityIds.isEmpty()) return out;
        jdbc.query("SELECT id, label FROM catalog_items WHERE id = ANY(CAST(:ids AS bigint[]))",
                Map.of("ids", activityIds.toArray(Long[]::new)), rs -> { out.put(rs.getLong("id"), rs.getString("label")); });
        return out;
    }

    /** El nombre con que la gente conoce cada sección: el de su lugar si lo tiene (SPEC-203 §2.1). */
    public Map<Long, String> displayNames(Collection<Long> zoneIds) {
        Map<Long, String> out = new HashMap<>();
        if (zoneIds.isEmpty()) return out;
        jdbc.query("""
                SELECT z.id, COALESCE((SELECT p.name FROM places p WHERE p.zone_id = z.id AND p.deleted_at IS NULL
                                       ORDER BY p.id LIMIT 1), z.name) AS display_name
                FROM zones z WHERE z.id = ANY(CAST(:ids AS bigint[]))""",
                Map.of("ids", zoneIds.toArray(Long[]::new)),
                rs -> { out.put(rs.getLong("id"), rs.getString("display_name")); });
        return out;
    }
}
