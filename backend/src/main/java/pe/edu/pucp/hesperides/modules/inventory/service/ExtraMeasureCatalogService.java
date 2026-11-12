package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.inventory.dto.ExtraMeasureForm;
import pe.edu.pucp.hesperides.modules.inventory.dto.ExtraMeasureResponse;
import pe.edu.pucp.hesperides.modules.inventory.repository.ExtraMeasureRepository;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/** El catálogo global de medidas adicionales (SPEC-105 D-08). */
@Service
@RequiredArgsConstructor
public class ExtraMeasureCatalogService {

    private static final int MAX_CODE_LENGTH = 50;

    private final JdbcTemplate jdbc;
    private final ExtraMeasureRepository measures;

    public List<ExtraMeasureResponse> active() {
        return measures.active();
    }

    @Transactional
    public ExtraMeasureResponse create(ExtraMeasureForm form) {
        String label = form.label().trim();
        String unitCode = form.unitCode().trim();
        requireUnit(unitCode);
        requireNameIsFree(label);
        String code = toCode(label);
        jdbc.update("""
                INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, metadata)
                SELECT ct.id, ?, ?, (SELECT COALESCE(MAX(ci.sort_order), 0) + 1 FROM catalog_items ci
                                      WHERE ci.catalog_type_id = ct.id), jsonb_build_object('unitCode', ?::text)
                  FROM catalog_types ct WHERE ct.code = 'EXTRA_MEASURE'""", code, label, unitCode);
        return new ExtraMeasureResponse(code, label, unitCode, null);
    }

    private void requireUnit(String unitCode) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                WHERE ct.code = 'MEASUREMENT_UNIT' AND ci.code = ? AND ci.is_active)""",
                Boolean.class, unitCode);
        if (!Boolean.TRUE.equals(exists)) {
            throw new ValidationException("Unidad no válida: " + unitCode);
        }
    }

    private void requireNameIsFree(String label) {
        Boolean taken = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                WHERE ct.code = 'EXTRA_MEASURE' AND ci.deleted_at IS NULL
                                  AND unaccent(lower(ci.label)) = unaccent(lower(?)))""", Boolean.class, label);
        if (Boolean.TRUE.equals(taken)) {
            throw new DuplicateResourceException("Ya existe la medida «" + label + "»");
        }
    }

    private static String toCode(String label) {
        String plain = Normalizer.normalize(label, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String code = plain.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (code.isBlank()) {
            throw new ValidationException("El nombre de la medida debe tener letras o números");
        }
        return code.length() > MAX_CODE_LENGTH ? code.substring(0, MAX_CODE_LENGTH) : code;
    }
}
