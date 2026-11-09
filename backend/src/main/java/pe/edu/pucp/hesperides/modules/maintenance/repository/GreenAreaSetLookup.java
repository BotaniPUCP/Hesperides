package pe.edu.pucp.hesperides.modules.maintenance.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashSet;
import java.util.Set;

/**
 * Lo que el módulo de frecuencias necesita saber de un conjunto de áreas verdes
 * (SPEC-203): si existe y qué secciones activas tiene. Se lee por SQL para no
 * depender del módulo que administra los conjuntos.
 */
@Repository
@RequiredArgsConstructor
public class GreenAreaSetLookup {

    private final JdbcTemplate jdbc;

    public boolean isActiveSet(Long setId) {
        Integer found = jdbc.queryForObject(
                "SELECT COUNT(*) FROM green_area_sets WHERE id = ? AND deleted_at IS NULL", Integer.class, setId);
        return found != null && found > 0;
    }

    /** Secciones activas del conjunto; una sección dada de baja ya no cuenta. */
    public Set<Long> activeZonesOf(Long setId) {
        return new HashSet<>(jdbc.queryForList("""
                SELECT gz.zone_id FROM green_area_set_zones gz
                JOIN zones z ON z.id = gz.zone_id
                WHERE gz.set_id = ? AND gz.deleted_at IS NULL AND z.deleted_at IS NULL AND z.is_active = TRUE
                """, Long.class, setId));
    }
}
