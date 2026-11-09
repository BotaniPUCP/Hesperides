package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Optional;

/** Traduce a ids los códigos de catálogo que llegan en el formulario de una especie. */
@Component
@RequiredArgsConstructor
class SpeciesCatalogs {

    private static final String ITEM_BY_CODE = """
            SELECT ci.id FROM catalog_items ci
              JOIN catalog_types ct ON ct.id = ci.catalog_type_id
             WHERE ct.code = '%s' AND ci.code = ? AND ci.is_active
            """;

    private final JdbcTemplate jdbc;

    long type(String code) {
        return find("SPECIES_TYPE", code)
                .orElseThrow(() -> new ValidationException("Tipo de vegetación no válido: " + code));
    }

    /** El origen es opcional: un código que no existe se trata como no indicado. */
    Long origin(String code) {
        return isBlank(code) ? null : find("SPECIES_ORIGIN", code).orElse(null);
    }

    Long referenceSource(String code) {
        return isBlank(code) ? null : find("REFERENCE_VALUE_SOURCE", code)
                .orElseThrow(() -> new ValidationException("Fuente de promedio no válida: " + code));
    }

    private Optional<Long> find(String catalog, String code) {
        return jdbc.query(ITEM_BY_CODE.formatted(catalog), (rs, i) -> rs.getLong(1), code.trim()).stream().findFirst();
    }

    private static boolean isBlank(String code) {
        return code == null || code.isBlank();
    }
}
