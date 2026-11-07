package pe.edu.pucp.hesperides.modules.catalogs.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.util.Map;
import java.util.Objects;

/**
 * La unidad de una medida adicional vive en metadata (SPEC-105 §4.4), que el
 * catálogo permite editar. Cambiarla reinterpretaría en silencio los valores ya
 * registrados: 3 metros pasarían a leerse como 3 tallos.
 */
@Component
@RequiredArgsConstructor
class ExtraMeasureUnitGuard {

    private static final String EXTRA_MEASURE = "EXTRA_MEASURE";
    private static final String UNIT_KEY = "unitCode";

    private final JdbcTemplate jdbc;

    void requireUnitOnCreate(String typeCode, Map<String, Object> metadata) {
        if (EXTRA_MEASURE.equals(typeCode) && (metadata == null || metadata.get(UNIT_KEY) == null)) {
            throw new BusinessRuleException("Una medida adicional necesita su unidad");
        }
    }

    void requireUnitUnchanged(CatalogItem item, Map<String, Object> metadata) {
        if (metadata == null || !EXTRA_MEASURE.equals(item.getCatalogType().getCode())) {
            return;
        }
        Object current = item.getMetadata() == null ? null : item.getMetadata().get(UNIT_KEY);
        if (Objects.equals(current, metadata.get(UNIT_KEY))) {
            return;
        }
        Boolean hasValues = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM green_element_measurement_values
                                WHERE measure_item_id = ? AND deleted_at IS NULL)""", Boolean.class, item.getId());
        if (Boolean.TRUE.equals(hasValues)) {
            throw new BusinessRuleException("La unidad no se puede cambiar: esta medida ya tiene valores registrados");
        }
    }
}
