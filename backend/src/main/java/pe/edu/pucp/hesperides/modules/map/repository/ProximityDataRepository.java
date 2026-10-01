package pe.edu.pucp.hesperides.modules.map.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Datos crudos que necesita el algoritmo de cercanía: secciones, edificios del
 * campus y referencias, con la geometría en GeoJSON (WGS 84). La conversión al
 * plano local la hace el servicio; el Engine nunca ve la base.
 */
@Repository
@RequiredArgsConstructor
public class ProximityDataRepository {

    private static final String SECTIONS = "SELECT z.id, z.code, z.name, ST_AsGeoJSON(z.boundary, 8) AS geom "
            + "FROM zones z JOIN catalog_items t ON t.id = z.zone_type_item_id AND t.code = 'SECTION' "
            + "WHERE z.deleted_at IS NULL AND z.is_active AND z.boundary IS NOT NULL ORDER BY z.id";

    // Solo los del campus: los del entorno se dibujan como contexto, pero ninguna
    // incidencia del campus debe describirse por un edificio de la calle.
    private static final String BUILDINGS = "SELECT b.id, b.name, ST_AsGeoJSON(b.footprint, 8) AS geom "
            + "FROM campus_buildings b WHERE b.deleted_at IS NULL AND b.is_active AND b.is_campus ORDER BY b.id";

    private static final String PLACES = "SELECT r.name, c.label AS category, ST_Y(r.location) AS lat, "
            + "ST_X(r.location) AS lon FROM place_references r JOIN catalog_items c ON c.id = r.category_item_id "
            + "WHERE r.deleted_at IS NULL AND r.is_active ORDER BY r.id";

    private final JdbcTemplate jdbcTemplate;

    public List<RawShape> sections() {
        return jdbcTemplate.query(SECTIONS, (rs, i) ->
                new RawShape(rs.getLong("id"), rs.getString("code"), rs.getString("name"), rs.getString("geom")));
    }

    public List<RawShape> campusBuildings() {
        return jdbcTemplate.query(BUILDINGS, (rs, i) ->
                new RawShape(rs.getLong("id"), null, rs.getString("name"), rs.getString("geom")));
    }

    public List<RawPlace> places() {
        return jdbcTemplate.query(PLACES, (rs, i) -> new RawPlace(rs.getString("name"),
                rs.getString("category"), rs.getDouble("lat"), rs.getDouble("lon")));
    }

    /** Forma tal como sale de la base: geometría en GeoJSON. */
    public record RawShape(long id, String code, String name, String geoJson) {
    }

    /** Referencia tal como sale de la base. */
    public record RawPlace(String name, String category, double lat, double lon) {
    }
}
