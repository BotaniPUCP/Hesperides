package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Los edificios que forman cada lugar. */
@Repository
@RequiredArgsConstructor
public class PlaceBuildingRepository {

    /** Un edificio que ya es de otro lugar vigente. */
    public record Owner(long buildingId, String placeCode, String placeName) {
    }

    private final JdbcTemplate jdbc;

    /** El primero de esos edificios que ya pertenece a un lugar distinto de {@code exceptPlaceId}. */
    public Optional<Owner> firstTaken(List<Long> buildingIds, Long exceptPlaceId) {
        if (buildingIds.isEmpty()) {
            return Optional.empty();
        }
        return jdbc.query("""
                SELECT pb.building_id, p.code, p.name FROM place_buildings pb JOIN places p ON p.id = pb.place_id
                 WHERE pb.deleted_at IS NULL AND p.deleted_at IS NULL AND pb.building_id = ANY (?)
                   AND (CAST(? AS BIGINT) IS NULL OR p.id <> ?)
                 ORDER BY pb.building_id LIMIT 1""",
                (rs, i) -> new Owner(rs.getLong(1), rs.getString(2), rs.getString(3)),
                buildingIds.toArray(Long[]::new), exceptPlaceId, exceptPlaceId).stream().findFirst();
    }

    public void replace(long placeId, List<Long> buildingIds) {
        jdbc.update("""
                UPDATE place_buildings SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE place_id = ? AND deleted_at IS NULL""", placeId);
        buildingIds.forEach(buildingId ->
                jdbc.update("INSERT INTO place_buildings (place_id, building_id) VALUES (?, ?)", placeId, buildingId));
    }
}
