package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Lo que una carga de ejemplares consulta en la base antes de escribir. */
@Repository
@RequiredArgsConstructor
public class SpecimenLookupRepository {

    /** Una especie del catálogo, con el tipo que decide su umbral de duplicado. */
    public record SpeciesRef(long id, String slug, String scientificName, String typeCode) {
    }

    private final JdbcTemplate jdbc;

    /** Por nombre científico normalizado ({@link SpeciesNames#key}). */
    public Map<String, SpeciesRef> speciesByName() {
        Map<String, SpeciesRef> out = new HashMap<>();
        jdbc.query("""
                SELECT s.id, s.slug, s.scientific_name, t.code FROM species s
                  JOIN catalog_items t ON t.id = s.species_type_item_id
                 WHERE s.deleted_at IS NULL AND s.is_active""",
                rs -> {
                    SpeciesRef ref = new SpeciesRef(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4));
                    out.put(SpeciesNames.key(ref.scientificName()), ref);
                });
        return out;
    }

    public Set<String> existingCodes() {
        return jdbc.queryForList("SELECT code FROM green_elements WHERE deleted_at IS NULL", String.class)
                .stream().collect(Collectors.toSet());
    }

    /** Todos los ejemplares con su especie: el catastro cabe en memoria (~1000 filas). */
    public List<Nearby> registeredPlants() {
        return jdbc.query("""
                SELECT e.code, s.slug, ST_Y(e.location), ST_X(e.location) FROM green_elements e
                  JOIN species s ON s.id = e.species_id
                 WHERE e.deleted_at IS NULL AND e.location IS NOT NULL""",
                (rs, i) -> new Nearby(rs.getString(1), rs.getString(2), rs.getDouble(3), rs.getDouble(4)));
    }

    /** ¿Cae dentro del límite del campus, o a menos de {@code marginM} metros de él? */
    public boolean nearCampus(double lat, double lon, double marginM) {
        Boolean inside = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM campus_features f JOIN catalog_items t ON t.id = f.feature_type_item_id
                 WHERE t.code = 'CAMPUS_BOUNDARY' AND f.deleted_at IS NULL
                   AND ST_DWithin(f.geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?))""",
                Boolean.class, lon, lat, marginM);
        return Boolean.TRUE.equals(inside);
    }

    /**
     * Si el ejemplar ya tiene la foto de ese enlace (guardada o pendiente de la
     * sincronización). Un CSV exportado y vuelto a cargar trae el mismo enlace:
     * no debe duplicar la foto.
     */
    public boolean hasPhotoFrom(String code, String link) {
        Boolean has = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM green_elements e WHERE e.code = ? AND e.deleted_at IS NULL
                   AND (e.photo_url = ? OR EXISTS (SELECT 1 FROM green_element_attachments a
                         WHERE a.green_element_id = e.id AND a.source_url = ? AND a.deleted_at IS NULL)))""",
                Boolean.class, code, link, link);
        return Boolean.TRUE.equals(has);
    }

    public long userId(String email) {
        Long id = jdbc.queryForObject("SELECT id FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL",
                Long.class, email);
        if (id == null) {
            throw new IllegalStateException("Usuario de la sesión inexistente: " + email);
        }
        return id;
    }
}
