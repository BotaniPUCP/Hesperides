package pe.edu.pucp.hesperides.modules.maintenance.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Lo que el módulo de frecuencias necesita saber de un conjunto de áreas verdes
 * (SPEC-203): si existe y qué secciones activas tiene. Se lee por SQL para no
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

    /** Conjuntos activos de cada sección activa: con ellos se elige la regla efectiva (SPEC-203 §5.8). */
    public Map<Long, Set<Long>> setsContaining(Collection<Long> zoneIds) {
        Map<Long, Set<Long>> out = new HashMap<>();
        if (zoneIds.isEmpty()) return out;
        jdbc.query("""
                SELECT gz.zone_id, gz.set_id FROM green_area_set_zones gz
                JOIN green_area_sets s ON s.id = gz.set_id AND s.deleted_at IS NULL
                JOIN zones z ON z.id = gz.zone_id AND z.deleted_at IS NULL AND z.is_active
                WHERE gz.deleted_at IS NULL AND gz.zone_id = ANY(?)""",
                ps -> ps.setArray(1, ps.getConnection().createArrayOf("bigint", zoneIds.toArray())),
                rs -> { out.computeIfAbsent(rs.getLong("zone_id"), k -> new HashSet<>()).add(rs.getLong("set_id")); });
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
