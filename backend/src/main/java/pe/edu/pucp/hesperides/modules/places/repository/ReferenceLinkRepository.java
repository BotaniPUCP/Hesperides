package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.Progress;

/** Las referencias antiguas, su estado de migración y sus enlaces al catálogo. */
@Repository
@RequiredArgsConstructor
public class ReferenceLinkRepository {

    public record GroupRow(String name, String category, List<String> codes, double lat, double lon) {
    }

    /** Una referencia pedida por código: su id, su nombre y si ya se decidió. */
    public record ReferenceRow(long id, String code, String name, boolean decided) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public List<GroupRow> pendingGroups(String searchPattern, int limit, int offset) {
        MapSqlParameterSource params = new MapSqlParameterSource("search", searchPattern).addValue("limit", limit)
                .addValue("offset", offset);
        return jdbc.query(ReferenceLinkQueries.PENDING_GROUPS, params, (rs, i) -> new GroupRow(rs.getString("name"),
                rs.getString("category"), Arrays.asList(rs.getString("codes").split(",")), rs.getDouble("lat"),
                rs.getDouble("lon")));
    }

    public int countPendingGroups(String searchPattern) {
        return jdbc.queryForObject(ReferenceLinkQueries.COUNT_PENDING_GROUPS, new MapSqlParameterSource("search", searchPattern),
                Integer.class);
    }

    public Progress progress() {
        return jdbc.queryForObject(ReferenceLinkQueries.PROGRESS, new MapSqlParameterSource(), (rs, i) -> {
            int total = rs.getInt("total"), linked = rs.getInt("linked"), discarded = rs.getInt("discarded");
            return new Progress(total, linked, discarded, total - linked - discarded);
        });
    }

    public List<ReferenceRow> byCodes(List<String> codes) {
        return jdbc.query("""
                SELECT r.id, r.code, r.name, EXISTS (SELECT 1 FROM place_reference_links l
                        WHERE l.reference_id = r.id AND l.deleted_at IS NULL) AS decided
                  FROM place_references r WHERE r.code IN (:codes) AND r.deleted_at IS NULL AND r.is_active""",
                new MapSqlParameterSource("codes", codes),
                (rs, i) -> new ReferenceRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getBoolean(4)));
    }

    /** {@code placeId} null es un descarte. */
    public void insert(long referenceId, Long placeId, Long perspectiveId, long userId) {
        jdbc.update("""
                INSERT INTO place_reference_links (reference_id, place_id, perspective_id, discarded, decided_by_user_id)
                VALUES (:reference, :place, :perspective, :discarded, :user)""",
                new MapSqlParameterSource("reference", referenceId).addValue("place", placeId)
                        .addValue("perspective", perspectiveId).addValue("discarded", placeId == null).addValue("user", userId));
    }
}
