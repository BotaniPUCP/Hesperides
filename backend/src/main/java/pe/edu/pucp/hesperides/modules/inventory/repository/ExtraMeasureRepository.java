package pe.edu.pucp.hesperides.modules.inventory.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.inventory.dto.ExtraMeasureResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenExtraMeasureResponse;

import java.time.LocalDate;
import java.util.List;

/** Lectura del catálogo de medidas adicionales y de sus valores (SPEC-105 §4.4). */
@Repository
@RequiredArgsConstructor
public class ExtraMeasureRepository {

    private final JdbcTemplate jdbc;

    public List<ExtraMeasureResponse> active() {
        return jdbc.query("""
                SELECT ci.code, ci.label, ci.metadata->>'unitCode' AS unit_code
                  FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = 'EXTRA_MEASURE' AND ci.is_active AND ci.deleted_at IS NULL
                 ORDER BY ci.sort_order, ci.label""",
                (rs, i) -> new ExtraMeasureResponse(rs.getString("code"), rs.getString("label"), rs.getString("unit_code"), null));
    }

    public List<ExtraMeasureResponse> ofSpecies(String slug) {
        return jdbc.query("""
                SELECT ci.code, ci.label, ci.metadata->>'unitCode' AS unit_code, m.reference_note
                  FROM species_extra_measures m
                  JOIN species s ON s.id = m.species_id
                  JOIN catalog_items ci ON ci.id = m.measure_item_id
                 WHERE s.slug = ? AND m.deleted_at IS NULL AND ci.is_active
                 ORDER BY m.sort_order, m.id""",
                (rs, i) -> new ExtraMeasureResponse(rs.getString("code"), rs.getString("label"), rs.getString("unit_code"),
                        rs.getString("reference_note")), slug);
    }

    /** El último valor de cada medida, aunque la medición más reciente no la traiga (SPEC-105 §5.4). */
    public List<SpecimenExtraMeasureResponse> latestOfSpecimen(String code) {
        return jdbc.query("""
                SELECT * FROM (
                    SELECT DISTINCT ON (v.measure_item_id) ci.code, ci.label, ci.sort_order,
                           ci.metadata->>'unitCode' AS unit_code, v.value, m.measured_at
                      FROM green_element_measurement_values v
                      JOIN green_element_measurements m ON m.id = v.measurement_id
                      JOIN green_elements g ON g.id = m.green_element_id
                      JOIN catalog_items ci ON ci.id = v.measure_item_id
                     WHERE g.code = ? AND v.deleted_at IS NULL AND m.deleted_at IS NULL
                     ORDER BY v.measure_item_id, m.measured_at DESC, m.id DESC) latest
                 ORDER BY sort_order, label""",
                (rs, i) -> new SpecimenExtraMeasureResponse(rs.getString("code"), rs.getString("label"),
                        rs.getString("unit_code"), rs.getBigDecimal("value"), rs.getObject("measured_at", LocalDate.class)), code);
    }
}
