package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.imports.dto.MeasurementResponse;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;

/** El historial de mediciones dendrométricas de un ejemplar, de la más reciente a la más antigua. */
@Repository
@RequiredArgsConstructor
public class MeasurementRepository {

    private final JdbcTemplate jdbc;

    public List<MeasurementResponse> history(long elementId) {
        return jdbc.query("""
                SELECT m.id, m.measured_at, m.height_m, m.trunk_height_m, m.dbh_cm, m.crown_radius_m, m.is_banded,
                       NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS measured_by,
                       m.notes, m.origin
                  FROM green_element_measurements m
                  LEFT JOIN users u ON u.id = m.measured_by_user_id
                 WHERE m.green_element_id = ? AND m.deleted_at IS NULL
                 ORDER BY m.measured_at DESC, m.id DESC""", (rs, i) -> map(rs), elementId);
    }

    private static MeasurementResponse map(ResultSet rs) throws SQLException {
        return new MeasurementResponse(
                rs.getLong("id"),
                rs.getObject("measured_at", LocalDate.class),
                toDouble(rs.getBigDecimal("height_m")),
                toDouble(rs.getBigDecimal("trunk_height_m")),
                toDouble(rs.getBigDecimal("dbh_cm")),
                toDouble(rs.getBigDecimal("crown_radius_m")),
                rs.getObject("is_banded", Boolean.class),
                rs.getString("measured_by"),
                rs.getString("notes"),
                rs.getString("origin")
        );
    }

    private static Double toDouble(java.math.BigDecimal val) {
        return val != null ? val.doubleValue() : null;
    }
}

