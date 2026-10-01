package pe.edu.pucp.hesperides.modules.map.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.map.dto.MapOrigin;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;

/**
 * Lectura de las capas del mapa con SQL nativo de PostGIS.
 *
 * Usa JdbcTemplate y no JPA a propósito: estas capas solo se leen y PostGIS ya
 * entrega el GeoJSON final. Mapearlas a entidades exigiría hibernate-spatial y
 * dos conversiones de geometría por petición para devolver lo mismo.
 */
@Repository
@RequiredArgsConstructor
public class MapLayersRepository {

    private final JdbcTemplate jdbcTemplate;

    public long currentVersion() {
        Long version = jdbcTemplate.queryForObject(MapLayerQueries.VERSION, Long.class);
        if (version == null) {
            throw new ResourceNotFoundException("La versión de datos del mapa no está inicializada");
        }
        return version;
    }

    public boolean attributionRequired() {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(MapLayerQueries.ATTRIBUTION_REQUIRED, Boolean.class));
    }

    public MapOrigin origin() {
        List<MapOrigin> rows = jdbcTemplate.query(MapLayerQueries.ORIGIN,
                (rs, i) -> new MapOrigin(rs.getDouble("lat"), rs.getDouble("lon")));
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Falta el límite del campus: el mapa no tiene origen");
        }
        return rows.get(0);
    }

    public String zones(String zoneTypeCode) {
        return jdbcTemplate.queryForObject(MapLayerQueries.ZONES, String.class, zoneTypeCode);
    }

    public String supervisionZones() {
        return jdbcTemplate.queryForObject(MapLayerQueries.SUPERVISION_ZONES, String.class);
    }

    public String references() {
        return jdbcTemplate.queryForObject(MapLayerQueries.REFERENCES, String.class);
    }

    public String buildings() {
        return jdbcTemplate.queryForObject(MapLayerQueries.BUILDINGS, String.class);
    }

    public String features() {
        return jdbcTemplate.queryForObject(MapLayerQueries.FEATURES, String.class);
    }
}
