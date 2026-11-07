package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesForm;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/** Qué medidas adicionales se piden a los ejemplares de una especie (SPEC-105 §5.1). */
@Component
@RequiredArgsConstructor
class SpeciesExtraMeasures {

    private final JdbcTemplate jdbc;

    /**
     * Deja a la especie con exactamente estas medidas. Sin lista, las conserva. Una
     * medida que se quita deja de pedirse, pero sus valores siguen en el historial.
     */
    void assign(long speciesId, List<SpeciesForm.ExtraMeasure> measures) {
        if (measures == null) {
            return;
        }
        var seen = new HashSet<String>();
        if (!measures.stream().map(SpeciesForm.ExtraMeasure::code).allMatch(seen::add)) {
            throw new ValidationException("Una medida adicional no se puede repetir");
        }
        List<Long> ids = measures.stream().map(m -> measureId(m.code())).toList();
        retireAllExcept(speciesId, ids);
        for (int i = 0; i < ids.size(); i++) {
            upsert(speciesId, ids.get(i), measures.get(i).referenceNote(), i + 1);
        }
    }

    private long measureId(String code) {
        Optional<Long> id = jdbc.query("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = 'EXTRA_MEASURE' AND ci.code = ? AND ci.is_active AND ci.deleted_at IS NULL""",
                (rs, i) -> rs.getLong(1), code).stream().findFirst();
        return id.orElseThrow(() -> new ValidationException("Medida adicional no válida: " + code));
    }

    private void retireAllExcept(long speciesId, List<Long> ids) {
        jdbc.query("SELECT id, measure_item_id FROM species_extra_measures WHERE species_id = ? AND deleted_at IS NULL",
                (rs, i) -> new long[] {rs.getLong(1), rs.getLong(2)}, speciesId).stream()
                .filter(row -> !ids.contains(row[1]))
                .forEach(row -> jdbc.update("""
                        UPDATE species_extra_measures SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?""", row[0]));
    }

    private void upsert(long speciesId, long measureId, String note, int order) {
        String text = note != null && !note.isBlank() ? note.trim() : null;
        int updated = jdbc.update("""
                UPDATE species_extra_measures SET reference_note = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE species_id = ? AND measure_item_id = ? AND deleted_at IS NULL""", text, order, speciesId, measureId);
        if (updated == 0) {
            jdbc.update("""
                    INSERT INTO species_extra_measures (species_id, measure_item_id, reference_note, sort_order)
                    VALUES (?, ?, ?, ?)""", speciesId, measureId, text, order);
        }
    }
}
