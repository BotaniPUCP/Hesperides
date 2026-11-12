package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.dto.SpeciesImportOption;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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

    /** Catalog identity and status used only by the specimen-import workflow. */
    public record SpecimenSpecies(long id, String slug, String scientificName, String commonName,
                                  String typeCode, boolean active, String dataFingerprint) {
    }

    public record SpeciesNameIndex(Map<String, List<SpecimenSpecies>> scientificNames,
                                   Map<String, List<SpecimenSpecies>> alternativeNames,
                                   Map<String, SpecimenSpecies> bySlug) {
    }

    public record SpecimenSnapshot(String dataFingerprint, Long speciesId, String scientificName) {
    }

    private final JdbcTemplate jdbc;

    /** Por nombre científico normalizado ({@link SpeciesNameKey#key(String)}). */
    public Map<String, SpeciesRef> speciesByName() {
        Map<String, SpeciesRef> out = new HashMap<>();
        jdbc.query("""
                SELECT s.id, s.slug, s.scientific_name, t.code FROM species s
                  JOIN catalog_items t ON t.id = s.species_type_item_id
                 WHERE s.deleted_at IS NULL AND s.is_active""",
                rs -> {
                    SpeciesRef ref = new SpeciesRef(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4));
                    out.put(SpeciesNameKey.key(ref.scientificName()), ref);
                });
        return out;
    }

    /** All non-deleted species for specimen import resolution, regardless of is_active. */
    public SpeciesNameIndex speciesNameIndexForSpecimens() {
        Map<String, List<SpecimenSpecies>> scientific = new LinkedHashMap<>();
        Map<String, List<SpecimenSpecies>> alternatives = new LinkedHashMap<>();
        Map<String, SpecimenSpecies> bySlug = new HashMap<>();
        Map<Long, SpecimenSpecies> byId = new HashMap<>();

        jdbc.query("""
                SELECT s.id, s.slug, s.scientific_name, s.common_name, t.code AS type_code,
                       s.is_active,
                       md5((to_jsonb(s) - 'is_active' - 'updated_at')::text) AS data_fingerprint
                  FROM species s
                  JOIN catalog_items t ON t.id = s.species_type_item_id
                 WHERE s.deleted_at IS NULL
                """, rs -> {
            SpecimenSpecies species = new SpecimenSpecies(rs.getLong("id"), rs.getString("slug"),
                    rs.getString("scientific_name"), rs.getString("common_name"), rs.getString("type_code"),
                    rs.getBoolean("is_active"), rs.getString("data_fingerprint"));
            byId.put(species.id(), species);
            bySlug.put(species.slug(), species);
            scientific.computeIfAbsent(SpeciesNameKey.key(species.scientificName()), ignored -> new ArrayList<>())
                    .add(species);
        });

        jdbc.query("""
                SELECT n.species_id, n.name
                  FROM species_common_names n
                  JOIN species s ON s.id = n.species_id
                 WHERE n.deleted_at IS NULL AND s.deleted_at IS NULL
                """, rs -> {
            SpecimenSpecies species = byId.get(rs.getLong("species_id"));
            if (species != null) {
                List<SpecimenSpecies> matches = alternatives.computeIfAbsent(
                        SpeciesNameKey.key(rs.getString("name")), ignored -> new ArrayList<>());
                if (matches.stream().noneMatch(existing -> existing.id() == species.id())) matches.add(species);
            }
        });
        return new SpeciesNameIndex(scientific, alternatives, bySlug);
    }

    /** Search options are restricted to species eligible for new specimen rows. */
    public List<SpeciesImportOption> speciesImportOptions(String search, int limit) {
        String pattern = LikePattern.contains(search == null ? "" : search.trim());
        return jdbc.query("""
                SELECT s.slug, s.scientific_name, s.common_name, t.label AS vegetation_type, s.is_active
                  FROM species s
                  JOIN catalog_items t ON t.id = s.species_type_item_id
                  WHERE s.deleted_at IS NULL AND s.is_active
                   AND (unaccent(lower(concat_ws(' ', s.scientific_name, s.common_name)))
                          LIKE unaccent(lower(?))
                     OR EXISTS (SELECT 1 FROM species_common_names n
                                 WHERE n.species_id = s.id AND n.deleted_at IS NULL
                                   AND unaccent(lower(n.name)) LIKE unaccent(lower(?))))
                  ORDER BY s.scientific_name
                 LIMIT ?
                """, (rs, i) -> new SpeciesImportOption(rs.getString("slug"), rs.getString("scientific_name"),
                rs.getString("common_name"), rs.getString("vegetation_type"), rs.getBoolean("is_active")),
                pattern, pattern, Math.max(1, Math.min(limit, 50)));
    }

    public Set<String> existingCodes() {
        return jdbc.queryForList("SELECT code FROM green_elements WHERE deleted_at IS NULL", String.class)
                .stream().collect(Collectors.toSet());
    }

    public Map<String, String> specimenDataFingerprints(Set<String> codes, boolean lockRows) {
        if (codes.isEmpty()) return Map.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(codes.size(), "?"));
        Map<String, String> fingerprints = new HashMap<>();
        jdbc.query("SELECT e.code, md5((to_jsonb(e) - 'is_active' - 'updated_at')::text) AS data_fingerprint "
                        + "FROM green_elements e WHERE e.deleted_at IS NULL AND e.code IN ("
                        + placeholders + ")" + (lockRows ? " FOR UPDATE" : ""),
                rs -> {
                    fingerprints.put(rs.getString("code"), rs.getString("data_fingerprint"));
                }, codes.toArray());
        return fingerprints;
    }

    /** Reads the specimen version and its current taxon in one statement for a consistent preview. */
    public Map<String, SpecimenSnapshot> specimenSnapshots(Set<String> codes) {
        if (codes.isEmpty()) return Map.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(codes.size(), "?"));
        Map<String, SpecimenSnapshot> snapshots = new HashMap<>();
        jdbc.query("""
                SELECT e.code, md5((to_jsonb(e) - 'is_active' - 'updated_at')::text) AS data_fingerprint,
                       s.id AS species_id, s.scientific_name
                  FROM green_elements e
                  LEFT JOIN species s ON s.id = e.species_id
                 WHERE e.deleted_at IS NULL AND e.code IN (
                """ + placeholders + ")", (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
                    snapshots.put(rs.getString("code"), new SpecimenSnapshot(rs.getString("data_fingerprint"),
                            rs.getObject("species_id", Long.class), rs.getString("scientific_name")));
                },
                codes.toArray());
        return snapshots;
    }

    public Map<Long, String> speciesDataFingerprints(Set<Long> ids, boolean lockRows) {
        if (ids.isEmpty()) return Map.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        Map<Long, String> fingerprints = new HashMap<>();
        jdbc.query("SELECT s.id, md5((to_jsonb(s) - 'is_active' - 'updated_at')::text) AS data_fingerprint "
                        + "FROM species s WHERE s.deleted_at IS NULL AND s.id IN ("
                        + placeholders + ")" + (lockRows ? " FOR UPDATE" : ""),
                rs -> {
                    fingerprints.put(rs.getLong("id"), rs.getString("data_fingerprint"));
                }, ids.toArray());
        return fingerprints;
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
