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
 * Los ejemplares en las columnas del estándar (SPEC-103 §6.2). Cada alias de
 * la consulta es el nombre de la columna del CSV; la evaluación es la más
 * reciente del historial.
 */
@Repository
@RequiredArgsConstructor
public class SpecimenExportRepository {

    private static final String SQL = """
            SELECT e.code AS codigo, s.scientific_name AS nombre_cientifico,
                   ST_Y(COALESCE(e.location, ST_PointOnSurface(e.area))) AS latitud,
                   ST_X(COALESCE(e.location, ST_PointOnSurface(e.area))) AS longitud,
                   e.quantity AS cantidad, e.source_reference AS referencia_catastro, e.legacy_code AS placa_antigua,
                   e.source_location AS ubicacion_catastro, e.measured_at AS fecha_medicion,
                   e.height_m AS altura_m, e.trunk_height_m AS altura_fuste_m, e.dbh_cm AS dap_cm,
                   e.crown_radius_m AS radio_copa_m, e.is_banded AS zunchado,
                   a.assessed_on AS fecha_evaluacion, a.has_disease AS enfermedades, a.has_pests AS plagas,
                   a.has_mechanical_damage AS danos_mecanicos, a.is_leaning AS inclinacion,
                   a.has_dead_branches AS ramas_secas, a.has_cavities_or_rot AS cavidades,
                   a.has_exposed_roots AS raices_expuestas, a.interferes_with_infrastructure AS interferencia,
                   a.recommended_management AS manejo_recomendado, a.observation AS observacion_evaluacion,
                   e.photo_url AS foto, e.notes AS observaciones,
                   s.common_name AS nombre_comun,
                   (SELECT string_agg(n.name, '|' ORDER BY n.id) FROM species_common_names n
                     WHERE n.species_id = s.id AND n.deleted_at IS NULL) AS nombres_alternativos,
                   s.family AS familia, t.label AS tipo_vegetacion,
                   CASE WHEN e.quantity > 1 THEN 'Agrupación' ELSE 'Ejemplar' END AS tipo_elemento,
                   CASE e.data_source WHEN 'MEASURED' THEN 'Medido' WHEN 'GENERIC' THEN 'Genérico'
                        ELSE 'Sin medir' END AS origen_medidas
              FROM green_elements e
              JOIN species s ON s.id = e.species_id
              JOIN catalog_items t ON t.id = s.species_type_item_id
              LEFT JOIN LATERAL (SELECT * FROM green_element_assessments x
                                  WHERE x.green_element_id = e.id AND x.deleted_at IS NULL
                                  ORDER BY x.assessed_on DESC, x.id DESC LIMIT 1) a ON TRUE
             WHERE e.deleted_at IS NULL AND e.is_active
             ORDER BY e.code""";

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

    /** El mismo texto que el estándar acepta al cargar: «si»/«no», punto decimal, fecha ISO. */
    private static String text(Object value) {
        return switch (value) {
            case null -> "";
            case Boolean b -> b ? "si" : "no";
            case BigDecimal d -> d.stripTrailingZeros().toPlainString();
            default -> value.toString();
        };
    }
}
