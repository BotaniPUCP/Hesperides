package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.sql.Timestamp;

/** Definitive specimen deactivation with a serialized last-specimen transition. */
@Service
@RequiredArgsConstructor
public class SpecimenLifecycleService {

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    private record SpecimenState(long id, String code, Long speciesId) {
    }

    private record SpeciesState(String slug, boolean active) {
    }

    @Transactional
    public void deactivate(String code, String reason) {
        SpecimenState specimen = jdbc.query("""
                SELECT id, code, species_id FROM green_elements
                 WHERE code = ? AND deleted_at IS NULL AND is_active = TRUE FOR UPDATE
                """, (rs, row) -> new SpecimenState(rs.getLong("id"), rs.getString("code"),
                rs.getObject("species_id", Long.class)), code).stream().findFirst()
                .orElseGet(() -> alreadyInactiveOrMissing(code));

        SpeciesState species = specimen.speciesId() == null ? null : lockSpecies(specimen.speciesId());
        Timestamp elementDeletedAt = jdbc.queryForObject("""
                UPDATE green_elements
                   SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND is_active = TRUE AND deleted_at IS NULL
                RETURNING deleted_at
                """, (rs, row) -> rs.getTimestamp(1), specimen.id());

        Map<String, Object> specimenChanges = new LinkedHashMap<>();
        specimenChanges.put("code", specimen.code());
        specimenChanges.put("isActive", Map.of("before", true, "after", false));
        Map<String, Object> deletedAt = new LinkedHashMap<>();
        deletedAt.put("before", null);
        deletedAt.put("after", elementDeletedAt.toInstant().toString());
        specimenChanges.put("deletedAt", deletedAt);
        specimenChanges.put("reason", reason.trim());
        audit.record(AuditActionCode.GREEN_ELEMENT_SOFT_DELETED, "GreenElement", specimen.id(), specimenChanges);

        if (species != null && !species.active() && noActiveSpecimens(specimen.speciesId())) {
            Timestamp speciesDeletedAt = jdbc.queryForObject("""
                    UPDATE species SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND is_active = FALSE AND deleted_at IS NULL
                    RETURNING deleted_at
                    """, (rs, row) -> rs.getTimestamp(1), specimen.speciesId());
            if (speciesDeletedAt != null) {
                Map<String, Object> speciesChanges = new LinkedHashMap<>();
                speciesChanges.put("slug", species.slug());
                speciesChanges.put("isActive", Map.of("before", false, "after", false));
                Map<String, Object> speciesDeletedAtChange = new LinkedHashMap<>();
                speciesDeletedAtChange.put("before", null);
                speciesDeletedAtChange.put("after", speciesDeletedAt.toInstant().toString());
                speciesChanges.put("deletedAt", speciesDeletedAtChange);
                speciesChanges.put("specimenId", specimen.id());
                speciesChanges.put("specimenCode", specimen.code());
                speciesChanges.put("reason", "NO_ACTIVE_SPECIMENS_REMAIN");
                audit.record(AuditActionCode.SPECIES_AUTO_SOFT_DELETED, "Species", specimen.speciesId(), speciesChanges);
            }
        }
    }

    private SpecimenState alreadyInactiveOrMissing(String code) {
        boolean exists = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM green_elements WHERE code = ? AND deleted_at IS NULL)",
                Boolean.class, code));
        if (exists) throw new ConflictException("El ejemplar ya está inactivo y no puede reactivarse");
        throw new ResourceNotFoundException("Specimen not found: " + code);
    }

    private SpeciesState lockSpecies(long speciesId) {
        return jdbc.query("""
                SELECT slug, is_active FROM species WHERE id = ? AND deleted_at IS NULL FOR UPDATE
                """, (rs, row) -> new SpeciesState(rs.getString("slug"), rs.getBoolean("is_active")), speciesId)
                .stream().findFirst().orElse(null);
    }

    private boolean noActiveSpecimens(long speciesId) {
        Long count = jdbc.queryForObject("""
                SELECT count(*) FROM green_elements
                 WHERE species_id = ? AND is_active = TRUE AND deleted_at IS NULL
                """, Long.class, speciesId);
        return count == null || count == 0;
    }
}
