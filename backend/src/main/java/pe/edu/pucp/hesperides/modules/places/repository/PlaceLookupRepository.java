package pe.edu.pucp.hesperides.modules.places.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Traduce los códigos que llegan en una petición a los ids de la base. */
@Repository
@RequiredArgsConstructor
public class PlaceLookupRepository {

    private final JdbcTemplate jdbc;

    public long catalogItemId(String typeCode, String itemCode) {
        return jdbc.query("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types t ON t.id = ci.catalog_type_id
                 WHERE t.code = ? AND ci.code = ? AND ci.deleted_at IS NULL AND ci.is_active""",
                (rs, i) -> rs.getLong(1), typeCode, itemCode).stream().findFirst()
                .orElseThrow(() -> new ValidationException("Unknown " + typeCode + " code: " + itemCode));
    }

    public long buildingId(long id) {
        return single("SELECT id FROM campus_buildings WHERE id = ? AND deleted_at IS NULL", "Building not found: " + id, id);
    }

    public long zoneId(String code) {
        return single("SELECT id FROM zones WHERE code = ? AND deleted_at IS NULL", "Zone not found: " + code, code);
    }

    public long featureId(String code) {
        return single("SELECT id FROM campus_features WHERE code = ? AND deleted_at IS NULL", "Feature not found: " + code, code);
    }

    public long userId(String email) {
        return single("SELECT id FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL", "User not found: " + email,
                email);
    }

    /** Un GeoJSON que PostGIS no entiende es un input mal formado, no un error del servidor. */
    public void requireValidGeoJson(String geoJson) {
        try {
            Boolean valid = jdbc.queryForObject("SELECT ST_IsValid(ST_GeomFromGeoJSON(?))", Boolean.class, geoJson);
            if (!Boolean.TRUE.equals(valid)) {
                throw new ValidationException("The drawn outline is not a valid geometry");
            }
        } catch (DataAccessException e) {
            throw new ValidationException("The drawn outline is not valid GeoJSON");
        }
    }

    private long single(String sql, String notFound, Object arg) {
        return jdbc.query(sql, (rs, i) -> rs.getLong(1), arg).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(notFound));
    }
}
