package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Las especies del catálogo en las columnas del estándar (SPEC-103 §6.6).
 * Cada alias de la consulta coincide con el encabezado del CSV.
 */
@Repository
@RequiredArgsConstructor
public class SpeciesExportRepository {

    private static final String SQL = """
            SELECT s.scientific_name AS nombre_cientifico,
                   s.common_name AS nombre_comun,
                   (SELECT string_agg(n.name, '|' ORDER BY n.id)
                      FROM species_common_names n
                     WHERE n.species_id = s.id AND n.deleted_at IS NULL) AS nombres_alternativos,
                   s.family AS familia,
                   t.label AS tipo_vegetacion,
                   o.label AS origen,
                   s.description AS descripcion,
                   s.care_notes AS notas_cuidado,
                   s.is_critical AS es_critica,
                   s.reference_height_m AS altura_promedio_m,
                   hs.label AS fuente_altura,
                   s.reference_crown_radius_m AS radio_copa_promedio_m,
                   cs.label AS fuente_radio_copa,
                   s.uses_trunk_height AS usa_altura_fuste,
                   s.uses_dbh AS usa_dap,
                   p.source_url AS foto,
                   s.slug AS slug,
                   (SELECT COALESCE(SUM(e.quantity), 0)
                      FROM green_elements e
                     WHERE e.species_id = s.id AND e.deleted_at IS NULL AND e.is_active) AS ejemplares
              FROM species s
              JOIN catalog_items t ON t.id = s.species_type_item_id
              LEFT JOIN catalog_items o ON o.id = s.origin_item_id
              LEFT JOIN catalog_items hs ON hs.id = s.reference_height_source_item_id
              LEFT JOIN catalog_items cs ON cs.id = s.reference_crown_radius_source_item_id
              LEFT JOIN LATERAL (
                  SELECT sp.source_url
                    FROM species_photos sp
                   WHERE sp.species_id = s.id AND sp.deleted_at IS NULL
                     AND (sp.source_url LIKE '%drive.google.com%'
                       OR sp.source_url LIKE '%docs.google.com%'
                       OR sp.source_url LIKE '%lh3.googleusercontent.com%')
                   ORDER BY sp.sort_order, sp.id
                   LIMIT 1
              ) p ON TRUE
              WHERE s.deleted_at IS NULL
                AND (s.is_active OR EXISTS (
                    SELECT 1 FROM green_elements active_element
                     WHERE active_element.species_id = s.id
                       AND active_element.is_active AND active_element.deleted_at IS NULL))
             ORDER BY s.scientific_name""";

    private final JdbcTemplate jdbc;

    public List<Map<String, String>> all() {
        return jdbc.query(SQL, (rs, i) -> row(rs));
    }

    private static Map<String, String> row(ResultSet rs) throws SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        Map<String, String> row = new LinkedHashMap<>();
        for (int c = 1; c <= meta.getColumnCount(); c++) {
            row.put(meta.getColumnLabel(c), text(rs.getObject(c)));
        }
        return row;
    }

    private static String text(Object value) {
        return switch (value) {
            case null -> "";
            case Boolean b -> b ? "si" : "no";
            case BigDecimal d -> d.stripTrailingZeros().toPlainString();
            default -> value.toString();
        };
    }
}
