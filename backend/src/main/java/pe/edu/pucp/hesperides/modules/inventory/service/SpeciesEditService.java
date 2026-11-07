package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesForm;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Corrige una especie del catálogo (SPEC-105 §5.1). El slug no cambia: las
 * direcciones guardadas siguen llevando a la misma ficha. Varias ediciones
 * simultáneas ganan por última escritura, y la auditoría conserva cada una.
 */
@Service
@RequiredArgsConstructor
public class SpeciesEditService {

    private final JdbcTemplate jdbc;
    private final GreenInventoryService inventoryService;
    private final AuditService auditService;
    private final SpeciesCatalogs catalogs;
    private final SpeciesMeasureProfiles profiles;

    private record Current(long id, boolean critical, BigDecimal referenceHeightM, BigDecimal referenceCrownRadiusM,
                           boolean usesTrunkHeight, boolean usesDbh) {
    }

    @Transactional
    public SpeciesResponse update(String slug, SpeciesForm form, boolean manager) {
        Current current = current(slug);
        String scientificName = SpeciesRegistrationService.normalizeScientificName(form.scientificName());
        requireNameIsFree(scientificName, current.id());
        long typeId = catalogs.type(form.vegetationTypeCode());
        Long originId = catalogs.origin(form.originCode());
        var profile = profiles.forEdit(form, current.critical(), current.usesTrunkHeight(), current.usesDbh(), manager);

        jdbc.update("""
                UPDATE species SET scientific_name = ?, common_name = ?, family = ?, species_type_item_id = ?,
                       origin_item_id = ?, description = ?, care_notes = ?, is_critical = ?, reference_height_m = ?,
                       reference_height_source_item_id = ?, reference_crown_radius_m = ?,
                       reference_crown_radius_source_item_id = ?, uses_trunk_height = ?, uses_dbh = ?,
                       updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?""",
                scientificName, textOrNull(form.commonName()), textOrNull(form.family()), typeId, originId,
                textOrNull(form.description()), textOrNull(form.careNotes()), profile.critical(),
                profile.referenceHeightM(), profile.referenceHeightSourceId(), profile.referenceCrownRadiusM(),
                profile.referenceCrownRadiusSourceId(), profile.usesTrunkHeight(), profile.usesDbh(), current.id());
        replaceOtherNames(current.id(), form.otherNames());
        audit(current, profile, slug, scientificName);
        return inventoryService.speciesBySlug(slug);
    }

    private Current current(String slug) {
        return jdbc.query("""
                SELECT id, is_critical, reference_height_m, reference_crown_radius_m, uses_trunk_height, uses_dbh
                  FROM species WHERE slug = ? AND deleted_at IS NULL""",
                (rs, i) -> new Current(rs.getLong("id"), rs.getBoolean("is_critical"),
                        rs.getBigDecimal("reference_height_m"), rs.getBigDecimal("reference_crown_radius_m"),
                        rs.getBoolean("uses_trunk_height"), rs.getBoolean("uses_dbh")), slug)
                .stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
    }

    private void requireNameIsFree(String scientificName, long id) {
        Boolean taken = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM species
                                WHERE lower(scientific_name) = lower(?) AND id <> ? AND deleted_at IS NULL)""",
                Boolean.class, scientificName, id);
        if (Boolean.TRUE.equals(taken)) {
            throw new DuplicateResourceException("La especie «" + scientificName + "» ya está registrada en el catálogo");
        }
    }

    private void replaceOtherNames(long id, List<String> otherNames) {
        jdbc.update("""
                UPDATE species_common_names SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE species_id = ? AND deleted_at IS NULL""", id);
        if (otherNames == null) {
            return;
        }
        otherNames.stream().filter(n -> n != null && !n.isBlank()).map(String::trim).distinct()
                .forEach(n -> jdbc.update("INSERT INTO species_common_names (species_id, name) VALUES (?, ?)", id, n));
    }

    private void audit(Current before, SpeciesMeasureProfiles.Profile after, String slug, String scientificName) {
        auditService.record(AuditActionCode.SPECIES_UPDATED, "Species", before.id(),
                Map.of("slug", slug, "scientificName", scientificName));
        if (before.critical() != after.critical()) {
            auditService.record(AuditActionCode.SPECIES_CRITICALITY_CHANGED, "Species", before.id(),
                    Map.of("from", before.critical(), "to", after.critical()));
        }
        if (changed(before.referenceHeightM(), after.referenceHeightM())
                || changed(before.referenceCrownRadiusM(), after.referenceCrownRadiusM())) {
            Map<String, Object> averages = new LinkedHashMap<>();
            averages.put("heightFrom", before.referenceHeightM());
            averages.put("heightTo", after.referenceHeightM());
            averages.put("crownRadiusFrom", before.referenceCrownRadiusM());
            averages.put("crownRadiusTo", after.referenceCrownRadiusM());
            auditService.record(AuditActionCode.SPECIES_REFERENCE_CHANGED, "Species", before.id(), averages);
        }
    }

    private static boolean changed(BigDecimal before, BigDecimal after) {
        if (before == null || after == null) {
            return before != after;
        }
        return before.compareTo(after) != 0;
    }

    private static String textOrNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
