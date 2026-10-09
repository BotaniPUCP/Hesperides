package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.imports.dto.AssessmentResponse;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;

/** El historial de evaluaciones de un ejemplar, de la más reciente a la más antigua. */
@Repository
@RequiredArgsConstructor
public class AssessmentRepository {

    private final JdbcTemplate jdbc;

    public List<AssessmentResponse> history(long elementId) {
        return jdbc.query("""
                SELECT a.id, a.assessed_on, a.has_disease, a.has_pests, a.has_mechanical_damage, a.is_leaning,
                       a.has_dead_branches, a.has_cavities_or_rot, a.has_exposed_roots,
                       a.interferes_with_infrastructure, a.recommended_management, a.observation,
                       NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS assessed_by
                  FROM green_element_assessments a
                  LEFT JOIN users u ON u.id = a.assessed_by_user_id
                 WHERE a.green_element_id = ? AND a.deleted_at IS NULL
                 ORDER BY a.assessed_on DESC, a.id DESC""", (rs, i) -> map(rs), elementId);
    }

    private static AssessmentResponse map(ResultSet rs) throws SQLException {
        return new AssessmentResponse(rs.getLong("id"), rs.getObject("assessed_on", LocalDate.class),
                flag(rs, "has_disease"), flag(rs, "has_pests"), flag(rs, "has_mechanical_damage"),
                flag(rs, "is_leaning"), flag(rs, "has_dead_branches"), flag(rs, "has_cavities_or_rot"),
                flag(rs, "has_exposed_roots"), flag(rs, "interferes_with_infrastructure"),
                rs.getString("recommended_management"), rs.getString("observation"), rs.getString("assessed_by"));
    }

    private static Boolean flag(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, Boolean.class);
    }
}
