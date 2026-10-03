package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Recorridos del árbol de lugares. */
@Repository
@RequiredArgsConstructor
public class PlaceTreeRepository {

    private static final String ANCESTORS = """
            WITH RECURSIVE up(id, parent, depth) AS (
                SELECT id, parent_place_id, 1 FROM places WHERE id = ? AND deleted_at IS NULL
                UNION ALL
                SELECT p.id, p.parent_place_id, up.depth + 1 FROM places p JOIN up ON p.id = up.parent
                 WHERE p.deleted_at IS NULL AND up.depth < 10)
            SELECT id FROM up ORDER BY depth""";

    private static final String DESCENDANTS = """
            WITH RECURSIVE down(id, depth) AS (
                SELECT id, 1 FROM places WHERE id = ? AND deleted_at IS NULL
                UNION ALL
                SELECT p.id, down.depth + 1 FROM places p JOIN down ON p.parent_place_id = down.id
                 WHERE p.deleted_at IS NULL AND down.depth < 10)
            """;

    private final JdbcTemplate jdbc;

    /** El lugar dado y sus ancestros, del más cercano al más lejano. El tope de 10 corta un ciclo previo a la regla. */
    public List<Long> selfAndAncestors(long placeId) {
        return jdbc.queryForList(ANCESTORS, Long.class, placeId);
    }

    /** Niveles del lugar con sus descendientes: 1 si no tiene hijos. */
    public int subtreeHeight(long placeId) {
        return jdbc.queryForObject(DESCENDANTS + "SELECT max(depth) FROM down", Integer.class, placeId);
    }

    /** El lugar, sus ancestros y sus descendientes: los que no sirven de hito para él. */
    public Set<Long> family(long placeId) {
        Set<Long> ids = new HashSet<>(selfAndAncestors(placeId));
        ids.addAll(jdbc.queryForList(DESCENDANTS + "SELECT id FROM down", Long.class, placeId));
        return ids;
    }
}
