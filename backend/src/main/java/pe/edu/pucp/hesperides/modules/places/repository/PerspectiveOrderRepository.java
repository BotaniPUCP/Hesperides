package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** El orden de las perspectivas de un lugar (V023). */
@Repository
@RequiredArgsConstructor
public class PerspectiveOrderRepository {

    private final JdbcTemplate jdbc;

    public Set<Long> activeIds(long placeId) {
        return new HashSet<>(jdbc.queryForList(
                "SELECT id FROM place_perspectives WHERE place_id = ? AND deleted_at IS NULL", Long.class, placeId));
    }

    /** {@code ids} en el orden nuevo: la primera queda con 1. */
    public void reorder(long placeId, List<Long> ids) {
        for (int i = 0; i < ids.size(); i++) {
            jdbc.update("UPDATE place_perspectives SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND place_id = ?",
                    i + 1, ids.get(i), placeId);
        }
    }
}
