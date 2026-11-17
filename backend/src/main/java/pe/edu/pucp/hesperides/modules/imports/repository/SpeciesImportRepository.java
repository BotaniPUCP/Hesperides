package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesVocabulary;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesVocabulary.Item;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Lo que la vista previa y la escritura de especies consultan: el catálogo
 * vigente de especies y los vocabularios de tipo de vegetación, origen y
 * fuentes de valores promedio.
 */
@Repository
@RequiredArgsConstructor
public class SpeciesImportRepository {

    public record SpeciesCurrentState(boolean active, String dataFingerprint) {
    }

    public record ExistingSpecies(
            long id,
            String slug,
            String scientificName,
            String vegetationTypeCode,
            String originCode,
            boolean critical,
            BigDecimal referenceHeightM,
            String referenceHeightSourceCode,
            BigDecimal referenceCrownRadiusM,
            String referenceCrownRadiusSourceCode,
            boolean usesTrunkHeight,
            boolean usesDbh,
            boolean active,
            String dataFingerprint,
            Set<String> photoSourceUrls
    ) {
    }

    private static final String EXISTING_SPECIES_SQL = """
            SELECT s.id, s.slug, s.scientific_name,
                   vt.code AS vegetation_type_code,
                   ori.code AS origin_code,
                   s.is_critical,
                   s.reference_height_m,
                   hs.code AS height_source_code,
                   s.reference_crown_radius_m,
                   cs.code AS crown_source_code,
                   s.uses_trunk_height,
                   s.uses_dbh,
                   s.is_active,
                   md5((to_jsonb(s) - 'is_active' - 'updated_at')::text) AS data_fingerprint
              FROM species s
              JOIN catalog_items vt ON vt.id = s.species_type_item_id
              LEFT JOIN catalog_items ori ON ori.id = s.origin_item_id
              LEFT JOIN catalog_items hs ON hs.id = s.reference_height_source_item_id
              LEFT JOIN catalog_items cs ON cs.id = s.reference_crown_radius_source_item_id
             WHERE s.deleted_at IS NULL""";

    private final JdbcTemplate jdbc;

    public SpeciesVocabulary vocabulary() {
        return new SpeciesVocabulary(
                items("SPECIES_TYPE"),
                items("SPECIES_ORIGIN"),
                items("REFERENCE_VALUE_SOURCE"));
    }

    public Map<String, ExistingSpecies> existingByKey() {
        Map<Long, Set<String>> photosBySpecies = activePhotoSourceUrls();
        Map<String, ExistingSpecies> byKey = new HashMap<>();
        jdbc.query(EXISTING_SPECIES_SQL, rs -> {
            long id = rs.getLong("id");
            ExistingSpecies existing = new ExistingSpecies(
                    id,
                    rs.getString("slug"),
                    rs.getString("scientific_name"),
                    rs.getString("vegetation_type_code"),
                    rs.getString("origin_code"),
                    rs.getBoolean("is_critical"),
                    rs.getBigDecimal("reference_height_m"),
                    rs.getString("height_source_code"),
                    rs.getBigDecimal("reference_crown_radius_m"),
                    rs.getString("crown_source_code"),
                    rs.getBoolean("uses_trunk_height"),
                    rs.getBoolean("uses_dbh"),
                    rs.getBoolean("is_active"),
                    rs.getString("data_fingerprint"),
                    photosBySpecies.getOrDefault(id, Set.of()));
            String key = SpeciesNameKey.key(existing.scientificName());
            ExistingSpecies collision = byKey.putIfAbsent(key, existing);
            if (collision != null && collision.id() != existing.id()) {
                throw new BusinessRuleException("Multiple catalog species share a normalized scientific name; resolve the catalog before importing");
            }
        });
        return byKey;
    }

    public Map<String, Long> catalogIds(String catalogTypeCode) {
        Map<String, Long> ids = new HashMap<>();
        jdbc.query("""
                SELECT ci.code, ci.id FROM catalog_items ci
                  JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = ? AND ci.is_active AND ci.deleted_at IS NULL""",
                rs -> {
                    ids.put(rs.getString(1), rs.getLong(2));
                }, catalogTypeCode);
        return ids;
    }

    public Map<Long, SpeciesCurrentState> currentDataFingerprints(Set<Long> ids, boolean lockRows) {
        if (ids.isEmpty()) return Map.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        Map<Long, SpeciesCurrentState> states = new HashMap<>();
        jdbc.query("SELECT s.id, s.is_active, md5((to_jsonb(s) - 'is_active' - 'updated_at')::text) AS data_fingerprint "
                        + "FROM species s WHERE s.deleted_at IS NULL AND s.id IN (" + placeholders + ")"
                        + (lockRows ? " FOR UPDATE" : ""),
                rs -> {
                    states.put(rs.getLong("id"), new SpeciesCurrentState(
                            rs.getBoolean("is_active"), rs.getString("data_fingerprint")));
                }, ids.toArray());
        return states;
    }

    private Map<Long, Set<String>> activePhotoSourceUrls() {
        Map<Long, Set<String>> map = new HashMap<>();
        jdbc.query("""
                SELECT species_id, source_url FROM species_photos
                 WHERE deleted_at IS NULL AND source_url IS NOT NULL""",
                rs -> {
                    map.computeIfAbsent(rs.getLong(1), k -> new HashSet<>()).add(rs.getString(2));
                });
        return map;
    }

    private List<Item> items(String catalog) {
        return jdbc.query("""
                SELECT ci.code, ci.label FROM catalog_items ci
                  JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = ? AND ci.is_active AND ci.deleted_at IS NULL
                 ORDER BY ci.sort_order""",
                (rs, i) -> new Item(rs.getString(1), rs.getString(2)), catalog);
    }
}
