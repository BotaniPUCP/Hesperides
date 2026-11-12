package pe.edu.pucp.hesperides.modules.imports.specimens;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Los valores de las medidas adicionales de una medición (SPEC-105 §5.6). */
@Component
@RequiredArgsConstructor
class ExtraMeasureValues {

    private static final String COUNT_UNIT = "UNIT";

    private final JdbcTemplate jdbc;

    private record Assigned(long measureId, String unitCode) {
    }

    /** Se valida antes de escribir la medición, para no dejar una fila a medias. */
    Map<String, Long> validate(long elementId, List<SpecimenDraft.ExtraValue> values) {
        if (values.isEmpty()) {
            return Map.of();
        }
        var seen = new HashSet<String>();
        if (!values.stream().map(SpecimenDraft.ExtraValue::code).allMatch(seen::add)) {
            throw new ValidationException("Una medida adicional no se puede repetir en la misma medición");
        }
        Map<String, Assigned> assigned = assignedTo(elementId);
        for (SpecimenDraft.ExtraValue value : values) {
            Assigned measure = assigned.get(value.code());
            if (measure == null) {
                throw new ValidationException("La medida «" + value.code() + "» no pertenece a esta especie");
            }
            if (COUNT_UNIT.equals(measure.unitCode()) && !isWhole(value.value())) {
                throw new ValidationException("La medida «" + value.code() + "» debe ser un número entero");
            }
        }
        return assigned.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().measureId()));
    }

    void save(long measurementId, List<SpecimenDraft.ExtraValue> values, Map<String, Long> measureIds) {
        values.forEach(value -> jdbc.update("""
                INSERT INTO green_element_measurement_values (measurement_id, measure_item_id, value) VALUES (?, ?, ?)""",
                measurementId, measureIds.get(value.code()), value.value()));
    }

    private Map<String, Assigned> assignedTo(long elementId) {
        record Row(String code, Assigned measure) {
        }
        return jdbc.query("""
                SELECT ci.id, ci.code, ci.metadata->>'unitCode' AS unit_code
                  FROM green_elements g
                  JOIN species_extra_measures m ON m.species_id = g.species_id AND m.deleted_at IS NULL
                  JOIN catalog_items ci ON ci.id = m.measure_item_id AND ci.is_active
                 WHERE g.id = ?""",
                (rs, i) -> new Row(rs.getString("code"), new Assigned(rs.getLong("id"), rs.getString("unit_code"))), elementId)
                .stream().collect(Collectors.toMap(Row::code, Row::measure));
    }

    private static boolean isWhole(BigDecimal value) {
        return value.stripTrailingZeros().scale() <= 0;
    }
}
