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

/** Definitive, audited species deactivation; never deletes or reactivates a row. */
@Service
@RequiredArgsConstructor
public class SpeciesLifecycleService {

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    private record SpeciesState(long id, boolean active) {
    }

    @Transactional
    public void deactivate(String slug, String reason) {
        SpeciesState species = jdbc.query("""
                SELECT id, is_active FROM species WHERE slug = ? AND deleted_at IS NULL FOR UPDATE
                """, (rs, row) -> new SpeciesState(rs.getLong("id"), rs.getBoolean("is_active")), slug)
                .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
        if (!species.active()) {
            throw new ConflictException("La especie ya está inactiva y no puede reactivarse");
        }

        long activeSpecimens = countActiveSpecimens(species.id());
        Timestamp deletedAt = jdbc.queryForObject("""
                UPDATE species
                   SET is_active = FALSE,
                       deleted_at = CASE WHEN ? = 0 THEN CURRENT_TIMESTAMP ELSE NULL END,
                       updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND is_active = TRUE AND deleted_at IS NULL
                RETURNING deleted_at
                """, (rs, row) -> rs.getTimestamp(1), activeSpecimens, species.id());

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("slug", slug);
        changes.put("isActive", Map.of("before", true, "after", false));
        Map<String, Object> deletedAtChange = new LinkedHashMap<>();
        deletedAtChange.put("before", null);
        deletedAtChange.put("after", deletedAt == null ? null : deletedAt.toInstant().toString());
        changes.put("deletedAt", deletedAtChange);
        changes.put("reason", reason.trim());
        changes.put("activeSpecimenCount", activeSpecimens);
        audit.record(AuditActionCode.SPECIES_SOFT_DELETED, "Species", species.id(), changes);
    }

    private long countActiveSpecimens(long speciesId) {
        Long count = jdbc.queryForObject("""
                SELECT count(*) FROM green_elements
                 WHERE species_id = ? AND is_active = TRUE AND deleted_at IS NULL
                """, Long.class, speciesId);
        return count == null ? 0 : count;
    }

}
