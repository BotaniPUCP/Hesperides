package pe.edu.pucp.hesperides.modules.reservations.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Las secciones que forman el contorno de un jardín: la suya o las de sus lugares
 * hijos (SPEC-107 §2.1). La ficha las manda para que el mapa enfoque el jardín.
 */
@Repository
@RequiredArgsConstructor
public class GardenSectionsRepository {

    private final JdbcTemplate jdbc;

    public List<String> sectionCodes(long placeId) {
        return jdbc.queryForList("""
                SELECT z.code FROM zones z
                 WHERE z.deleted_at IS NULL
                   AND (z.id = (SELECT p.zone_id FROM places p WHERE p.id = ?)
                        OR z.id IN (SELECT c.zone_id FROM places c
                                     WHERE c.parent_place_id = ? AND c.deleted_at IS NULL))
                 ORDER BY z.code""", String.class, placeId, placeId);
    }
}
