package pe.edu.pucp.hesperides.modules.planning.assignments.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Las asignaciones de frecuencias a conjuntos (SPEC-203 §3.4), por SQL. */
@Repository
@RequiredArgsConstructor
public class PlanningAssignmentsQueries {

    /** Una asignación activa de un conjunto activo. {@code ruleKey} nulo: quedó sin frecuencia. */
    public record Assignment(long id, long setId, String setName, long activityId, String activityLabel, UUID ruleKey) {
    }

    /** La versión vigente de una frecuencia, con lo que decide si se puede asignar. */
    public record FrequencyRef(long id, UUID ruleKey, long activityId, String activityLabel, String regime,
                               String ruleTypeCode, boolean current) {
    }

    private static final String SELECT_ASSIGNMENT = """
            SELECT pa.id, pa.set_id, s.name AS set_name, pa.activity_type_item_id, ci.label AS activity_label,
                   pa.frequency_rule_key
            FROM planning_assignments pa
            JOIN green_area_sets s ON s.id = pa.set_id AND s.deleted_at IS NULL
            JOIN catalog_items ci ON ci.id = pa.activity_type_item_id
            WHERE pa.deleted_at IS NULL""";

    private final NamedParameterJdbcTemplate jdbc;

    public List<Assignment> active() {
        return jdbc.query(SELECT_ASSIGNMENT + " ORDER BY lower(s.name), ci.label", Map.of(), PlanningAssignmentsQueries::assignment);
    }

    public List<Assignment> byRule(UUID ruleKey) {
        return jdbc.query(SELECT_ASSIGNMENT + " AND pa.frequency_rule_key = :rule ORDER BY lower(s.name), ci.label",
                Map.of("rule", ruleKey), PlanningAssignmentsQueries::assignment);
    }

    public Optional<Assignment> find(long id) {
        return jdbc.query(SELECT_ASSIGNMENT + " AND pa.id = :id", Map.of("id", id), PlanningAssignmentsQueries::assignment)
                .stream().findFirst();
    }

    public Optional<Assignment> findBySetAndActivity(long setId, long activityId) {
        return jdbc.query(SELECT_ASSIGNMENT + " AND pa.set_id = :set AND pa.activity_type_item_id = :activity",
                Map.of("set", setId, "activity", activityId), PlanningAssignmentsQueries::assignment).stream().findFirst();
    }

    /** La frecuencia pedida y si su versión es la vigente (sin cerrar, activa, no dada de baja). */
    public Optional<FrequencyRef> frequency(long frequencyId) {
        return jdbc.query("""
                SELECT f.id, f.rule_key, f.activity_type_item_id, ci.label, f.regime, rt.code,
                       (f.valid_to IS NULL AND f.is_active AND f.deleted_at IS NULL) AS is_current
                FROM maintenance_frequencies f
                JOIN catalog_items ci ON ci.id = f.activity_type_item_id
                JOIN catalog_items rt ON rt.id = f.frequency_rule_type_item_id
                WHERE f.id = :id""", Map.of("id", frequencyId),
                (rs, n) -> new FrequencyRef(rs.getLong("id"), rs.getObject("rule_key", UUID.class),
                        rs.getLong("activity_type_item_id"), rs.getString("label"), rs.getString("regime"),
                        rs.getString("code"), rs.getBoolean("is_current"))).stream().findFirst();
    }

    public Optional<String> activeSetName(long setId) {
        return jdbc.queryForList("SELECT name FROM green_area_sets WHERE id = :id AND deleted_at IS NULL",
                Map.of("id", setId), String.class).stream().findFirst();
    }

    public long insert(long setId, long activityId, UUID ruleKey) {
        Long id = jdbc.queryForObject("""
                INSERT INTO planning_assignments (set_id, activity_type_item_id, frequency_rule_key)
                VALUES (:set, :activity, :rule) RETURNING id""",
                new MapSqlParameterSource().addValue("set", setId).addValue("activity", activityId).addValue("rule", ruleKey),
                Long.class);
        return id == null ? 0 : id;
    }

    public void changeRule(long id, UUID ruleKey) {
        jdbc.update("UPDATE planning_assignments SET frequency_rule_key = :rule, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
                new MapSqlParameterSource().addValue("id", id).addValue("rule", ruleKey));
    }

    public void softDelete(long id) {
        jdbc.update("UPDATE planning_assignments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
                Map.of("id", id));
    }

    /**
     * Jardines del conjunto que ya están en otro conjunto con otra regla de la misma
     * actividad: los dos estados se calcularán por separado y el jardín quedará con
     * la más frecuente en los reportes (D-08).
     */
    public List<String> overlaps(long setId, long activityId, UUID ruleKey) {
        return jdbc.query("""
                SELECT DISTINCT z.name AS zone_name, other.name AS other_set
                FROM green_area_set_zones gz
                JOIN green_area_set_zones oz ON oz.zone_id = gz.zone_id AND oz.set_id <> gz.set_id AND oz.deleted_at IS NULL
                JOIN green_area_sets other ON other.id = oz.set_id AND other.deleted_at IS NULL
                JOIN planning_assignments pa ON pa.set_id = other.id AND pa.deleted_at IS NULL
                  AND pa.activity_type_item_id = :activity AND pa.frequency_rule_key IS NOT NULL
                  AND pa.frequency_rule_key <> :rule
                JOIN zones z ON z.id = gz.zone_id
                WHERE gz.set_id = :set AND gz.deleted_at IS NULL ORDER BY 1, 2""",
                new MapSqlParameterSource().addValue("set", setId).addValue("activity", activityId).addValue("rule", ruleKey),
                (rs, n) -> "La sección " + rs.getString("zone_name") + " también está en «" + rs.getString("other_set")
                        + "» con otra frecuencia de esta actividad; en los reportes se usará la más frecuente");
    }

    private static Assignment assignment(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new Assignment(rs.getLong("id"), rs.getLong("set_id"), rs.getString("set_name"),
                rs.getLong("activity_type_item_id"), rs.getString("activity_label"),
                rs.getObject("frequency_rule_key", UUID.class));
    }
}
