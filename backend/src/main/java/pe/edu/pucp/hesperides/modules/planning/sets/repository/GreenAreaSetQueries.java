package pe.edu.pucp.hesperides.modules.planning.sets.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.TypeCount;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ElementRef;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ZoneRef;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Secciones, ejemplares y actividades de un conjunto. Se reemplazan enteras al editar (baja
 * lógica de las anteriores) porque una fila de pertenencia no tiene identidad.
 */
@Repository
@RequiredArgsConstructor
public class GreenAreaSetQueries {

    /** Una sección del conjunto que ya sigue otra regla propia de la misma actividad (D-08). */

    private static final String ACTIVE_SECTION = """
            SELECT z.id FROM zones z JOIN catalog_items ci ON ci.id = z.zone_type_item_id
            JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'ZONE_TYPE' AND ci.code = 'SECTION' AND z.is_active AND z.deleted_at IS NULL""";

    /**
     * Un ejemplar con su sección y sector, calculados por posición: el catastro no
     * guarda la sección (un tercio está en veredas y plazas, fuera de todas).
     */
    private static final String ELEMENT_REF = """
            SELECT e.id, e.code, COALESCE(s.common_name, s.scientific_name, e.name, e.code) AS display_name,
                   t.label AS type_label, sec.name AS section_name, sector.id AS sector_id, sector.name AS sector_name
            FROM green_elements e
            LEFT JOIN species s ON s.id = e.species_id
            LEFT JOIN catalog_items t ON t.id = s.species_type_item_id
            LEFT JOIN LATERAL (
                SELECT z.name, z.parent_zone_id FROM zones z
                JOIN catalog_items zt ON zt.id = z.zone_type_item_id AND zt.code = 'SECTION'
                WHERE z.deleted_at IS NULL AND z.is_active AND ST_Contains(z.boundary, e.location)
                ORDER BY z.area_m2 LIMIT 1) sec ON TRUE
            LEFT JOIN zones sector ON sector.id = sec.parent_zone_id
            WHERE e.deleted_at IS NULL AND e.is_active""";

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

    /** Activos y sin baja; el resto no se puede planificar. */
    public List<Long> invalidElements(Collection<Long> ids) {
        return jdbc.queryForList("""
                SELECT id FROM unnest(CAST(:ids AS bigint[])) AS id WHERE id NOT IN (
                  SELECT e.id FROM green_elements e WHERE e.deleted_at IS NULL AND e.is_active) ORDER BY id""",
                Map.of("ids", ids.toArray(Long[]::new)), Long.class);
    }

    /** Los ejemplares vigentes del conjunto: uno dado de baja deja de contar, como una sección. */
    public List<ElementRef> elementsOf(long setId) {
        return jdbc.query(ELEMENT_REF + """
                 AND e.id IN (SELECT green_element_id FROM green_area_set_elements
                              WHERE set_id = :set AND deleted_at IS NULL)
                ORDER BY sector_name NULLS LAST, e.code""", Map.of("set", setId), GreenAreaSetQueries::elementRef);
    }

    /** Lo que el mapa deja elegir: ejemplares con punto, que son los que dibuja. */
    public List<ElementRef> elementOptions() {
        return jdbc.query(ELEMENT_REF + " AND e.location IS NOT NULL ORDER BY sector_name NULLS LAST, e.code",
                Map.of(), GreenAreaSetQueries::elementRef);
    }

    private static ElementRef elementRef(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new ElementRef(rs.getLong("id"), rs.getString("code"), rs.getString("display_name"),
                rs.getString("type_label"), rs.getString("section_name"), rs.getObject("sector_id", Long.class),
                rs.getString("sector_name"));
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

    public Map<Long, Integer> activeElementCounts() {
        var counts = new java.util.HashMap<Long, Integer>();
        jdbc.query("""
                SELECT ge.set_id, COUNT(*) AS n FROM green_area_set_elements ge
                JOIN green_elements e ON e.id = ge.green_element_id AND e.deleted_at IS NULL AND e.is_active
                WHERE ge.deleted_at IS NULL GROUP BY ge.set_id""",
                rs -> { counts.put(rs.getLong("set_id"), rs.getInt("n")); });
        return counts;
    }

    /** Los ejemplares activos de cada conjunto por tipo, del más numeroso al menos. */
    public Map<Long, List<TypeCount>> specimenTypes() {
        var out = new java.util.HashMap<Long, List<TypeCount>>();
        jdbc.query("""
                SELECT ge.set_id, COALESCE(t.label, 'Sin tipo') AS type_label, COUNT(*) AS n
                FROM green_area_set_elements ge
                JOIN green_elements e ON e.id = ge.green_element_id AND e.deleted_at IS NULL AND e.is_active
                LEFT JOIN species s ON s.id = e.species_id
                LEFT JOIN catalog_items t ON t.id = s.species_type_item_id
                WHERE ge.deleted_at IS NULL
                GROUP BY ge.set_id, COALESCE(t.label, 'Sin tipo')
                ORDER BY ge.set_id, n DESC, type_label""",
                rs -> { out.computeIfAbsent(rs.getLong("set_id"), k -> new java.util.ArrayList<>())
                        .add(new TypeCount(rs.getString("type_label"), rs.getInt("n"))); });
        return out;
    }

    /** Un conjunto dado de baja deja de planificarse: sus asignaciones se quitan con él. */
    public void retireAssignments(long setId) {
        jdbc.update("UPDATE planning_assignments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP"
                + " WHERE set_id = :set AND deleted_at IS NULL", Map.of("set", setId));
    }

    public void replaceElements(long setId, List<Long> elementIds) {
        replace("green_area_set_elements", "green_element_id", setId, elementIds);
    }

    public void replaceZones(long setId, List<Long> zoneIds) {
        replace("green_area_set_zones", "zone_id", setId, zoneIds);
    }

    private void replace(String table, String column, long setId, List<Long> ids) {
        var params = Map.of("set", setId, "ids", ids.toArray(Long[]::new));
        jdbc.update("UPDATE " + table + " SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP"
                + " WHERE set_id = :set AND deleted_at IS NULL", params);
        jdbc.update("INSERT INTO " + table + " (set_id, " + column + ") SELECT :set, id FROM unnest(CAST(:ids AS bigint[])) AS id",
                params);
    }
}
