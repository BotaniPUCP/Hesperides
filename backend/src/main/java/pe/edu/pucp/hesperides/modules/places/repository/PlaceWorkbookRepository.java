package pe.edu.pucp.hesperides.modules.places.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Identificadores que la carga masiva debe mantener únicos en el catálogo. */
@Repository
@RequiredArgsConstructor
public class PlaceWorkbookRepository {

    public record ExistingIdentifier(String placeCode, String value) {
    }

    public record LocationInput(int row, double lat, double lon) {
    }

    public record LocationMatch(int row, String code, String name) {
    }

    private final JdbcTemplate jdbc;

    public List<ExistingIdentifier> existingIdentifiers() {
        return jdbc.query("""
                SELECT p.code, p.name FROM places p WHERE p.deleted_at IS NULL
                UNION ALL
                SELECT p.code, a.alias FROM place_aliases a JOIN places p ON p.id = a.place_id
                 WHERE a.deleted_at IS NULL AND p.deleted_at IS NULL""", (rs, row) ->
                new ExistingIdentifier(rs.getString(1), rs.getString(2)));
    }

    public List<LocationMatch> placesAtLocations(List<LocationInput> locations) {
        if (locations.isEmpty()) return List.of();
        List<Object> parameters = new ArrayList<>(locations.size() * 3);
        String values = locations.stream().map(location -> {
            parameters.add(location.row());
            parameters.add(location.lat());
            parameters.add(location.lon());
            return "(?, ?, ?)";
        }).collect(Collectors.joining(", "));

        return jdbc.query("""
                WITH input_locations(row_number, lat, lon) AS (VALUES %s)
                SELECT input.row_number, p.code, p.name
                  FROM input_locations input
                  JOIN places p ON p.deleted_at IS NULL
                  LEFT JOIN place_outlines outline ON outline.place_id = p.id
                  LEFT JOIN places parent ON parent.id = p.parent_place_id AND parent.deleted_at IS NULL
                  LEFT JOIN place_outlines parent_outline ON parent_outline.place_id = parent.id
                 WHERE ST_Y(ST_Centroid(COALESCE(outline.geom, parent_outline.geom))) = input.lat
                   AND ST_X(ST_Centroid(COALESCE(outline.geom, parent_outline.geom))) = input.lon
                 ORDER BY input.row_number, lower(p.name), p.code
                """.formatted(values), (rs, row) -> new LocationMatch(rs.getInt(1), rs.getString(2), rs.getString(3)),
                parameters.toArray());
    }
}
