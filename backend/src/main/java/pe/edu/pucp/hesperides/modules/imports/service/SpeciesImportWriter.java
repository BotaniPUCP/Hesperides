package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesImportRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesImportRepository.ExistingSpecies;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesDraft;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesPreview;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository.NewPhoto;
import pe.edu.pucp.hesperides.modules.inventory.service.SpeciesRegistrationService;
import pe.edu.pucp.hesperides.modules.inventory.service.SpeciesSlugAllocator;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Confirma una carga de especies botánicas. Las fotos se descargan o extraen
 * del ZIP fuera de la transacción; luego todas las especies se crean o
 * actualizan en una sola transacción.
 */
@Component
@RequiredArgsConstructor
class SpeciesImportWriter {

    private final JdbcTemplate jdbc;
    private final SpeciesImportRepository repository;
    private final SpeciesPhotoRepository speciesPhotos;
    private final ImportPhotos importPhotos;
    private final ImportBatchGate gate;
    private final AuditService auditService;
    private final TransactionTemplate transaction;
    private final SpeciesSlugAllocator slugAllocator;

    ImportResultResponse write(Claimed claimed, SpeciesPreview preview, List<PlannedRow> rows) {
        long batchId = claimed.batch().id();
        long userId = claimed.userId();
        assertPreviewFresh(rows, false);
        List<ImportPreviewResponse.Issue> warnings = new ArrayList<>();
        List<ImportPhotos.Request> requests = rows.stream()
                .filter(r -> r.draft().photo() != null && !r.skipExistingPhotoLink())
                .map(r -> new ImportPhotos.Request(r.line(), r.draft().photo()))
                .toList();
        Map<String, byte[]> zip = gate.registrationZip(batchId, ImportPhotos.needsZip(requests));
        Map<Integer, StoredPhoto> stored = importPhotos.store("species/import-" + batchId, requests, zip, warnings);

        return transaction.execute(status -> {
            importPhotos.deleteAfterRollback(stored);
            gate.lockForConfirmation(claimed);
            assertPreviewFresh(rows, true);
            Map<String, Long> typeIds = repository.catalogIds("SPECIES_TYPE");
            Map<String, Long> originIds = repository.catalogIds("SPECIES_ORIGIN");
            Map<String, Long> sourceIds = repository.catalogIds("REFERENCE_VALUE_SOURCE");
            List<String> createdSlugs = new ArrayList<>();
            int updated = 0;

            for (PlannedRow row : rows) {
                SpeciesDraft d = row.draft();
                Long typeId = typeIds.get(row.effectiveVegetationTypeCode());
                Long originId = row.effectiveOriginCode() != null ? originIds.get(row.effectiveOriginCode()) : null;
                Long heightSourceId = row.effectiveHeightSourceCode() != null
                        ? sourceIds.get(row.effectiveHeightSourceCode())
                        : null;
                Long crownSourceId = row.effectiveCrownRadiusSourceCode() != null
                        ? sourceIds.get(row.effectiveCrownRadiusSourceCode())
                        : null;

                long speciesId;
                String slug;
                if (row.action() == ImportAction.CREATE) {
                    slug = slugAllocator.allocate(SpeciesRegistrationService.toSlug(d.scientificName()));
                    speciesId = insertSpecies(d, slug, typeId, originId, row, heightSourceId, crownSourceId, batchId);
                    if (d.otherNames() != null) {
                        insertOtherNames(speciesId, d.otherNames());
                    }
                    auditService.record(AuditActionCode.SPECIES_CREATED, "Species", speciesId,
                            Map.of("slug", slug, "scientificName", d.scientificName(), "importBatchId", batchId));
                    createdSlugs.add(slug);
                } else {
                    speciesId = row.existingId();
                    slug = row.existingSlug();
                    String canonicalName = row.existingScientificName() != null
                            ? row.existingScientificName()
                            : d.scientificName();
                    updateSpecies(speciesId, canonicalName, d, typeId, originId, row, heightSourceId, crownSourceId, batchId);
                    if (d.otherNames() != null) {
                        replaceOtherNames(speciesId, d.otherNames());
                    }
                    auditUpdate(speciesId, slug, canonicalName, row, batchId);
                    updated++;
                }

                StoredPhoto photo = stored.get(row.line());
                if (photo != null) {
                    speciesPhotos.append(speciesId,
                            new NewPhoto(photo, ImportPhotos.sourceLink(d.photo()), null, null, null),
                            userId);
                }
            }

            ImportResultResponse result = new ImportResultResponse(
                    batchId,
                    createdSlugs.size(),
                    updated,
                    ImportBatchGate.omitted(preview.rows(), rows),
                    List.of(),
                    warnings,
                    createdSlugs,
                    preview.skippedInactiveSpecies().size());
            gate.closeExclusive(batchId, result);
            return result;
        });
    }

    private void assertPreviewFresh(List<PlannedRow> rows, boolean lockRows) {
        Map<String, ExistingSpecies> currentByKey = repository.existingByKey();
        Set<Long> ids = rows.stream().filter(row -> row.action() == ImportAction.UPDATE)
                .map(PlannedRow::existingId).collect(java.util.stream.Collectors.toSet());
        Map<Long, SpeciesImportRepository.SpeciesCurrentState> currentStates =
                repository.currentDataFingerprints(ids, lockRows);
        for (PlannedRow row : rows) {
            if (row.action() == ImportAction.CREATE) {
                if (currentByKey.containsKey(SpeciesNameKey.key(row.draft().scientificName()))) {
                    throw new BusinessRuleException("A species was added after the preview. Re-analyze the file");
                }
                continue;
            }
            SpeciesImportRepository.SpeciesCurrentState current = currentStates.get(row.existingId());
            if (current == null || !current.active()) {
                throw new BusinessRuleException("An inactive species cannot be edited or reactivated");
            }
            if (!java.util.Objects.equals(current.dataFingerprint(), row.existingDataFingerprint())) {
                throw new BusinessRuleException("A species changed after the preview. Re-analyze the file");
            }
        }
    }

    private void auditUpdate(long speciesId, String slug, String scientificName, PlannedRow row, long batchId) {
        auditService.record(AuditActionCode.SPECIES_UPDATED, "Species", speciesId,
                Map.of("slug", slug, "scientificName", scientificName, "importBatchId", batchId));
        if (row.previousCritical() != null && row.previousCritical() != row.effectiveCritical()) {
            auditService.record(AuditActionCode.SPECIES_CRITICALITY_CHANGED, "Species", speciesId,
                    Map.of("from", row.previousCritical(), "to", row.effectiveCritical(), "importBatchId", batchId));
        }
        if (changed(row.previousHeightM(), row.effectiveHeightM())
                || changed(row.previousCrownRadiusM(), row.effectiveCrownRadiusM())) {
            Map<String, Object> averages = new LinkedHashMap<>();
            averages.put("heightFrom", row.previousHeightM());
            averages.put("heightTo", row.effectiveHeightM());
            averages.put("crownRadiusFrom", row.previousCrownRadiusM());
            averages.put("crownRadiusTo", row.effectiveCrownRadiusM());
            averages.put("importBatchId", batchId);
            auditService.record(AuditActionCode.SPECIES_REFERENCE_CHANGED, "Species", speciesId, averages);
        }
    }

    private static boolean changed(BigDecimal before, BigDecimal after) {
        if (before == null || after == null) {
            return before != after;
        }
        return before.compareTo(after) != 0;
    }

    private long insertSpecies(
            SpeciesDraft d,
            String slug,
            Long typeId,
            Long originId,
            PlannedRow row,
            Long heightSourceId,
            Long crownSourceId,
            long batchId
    ) {
        Long id = jdbc.queryForObject("""
                INSERT INTO species (
                    scientific_name, slug, common_name, family, species_type_item_id, origin_item_id,
                    description, care_notes, is_active, is_critical,
                    reference_height_m, reference_height_source_item_id,
                    reference_crown_radius_m, reference_crown_radius_source_item_id,
                    uses_trunk_height, uses_dbh, import_batch_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id""",
                Long.class,
                d.scientificName(), slug, d.commonName(), d.family(), typeId, originId,
                d.description(), d.careNotes(), row.effectiveCritical(),
                row.effectiveHeightM(), heightSourceId,
                row.effectiveCrownRadiusM(), crownSourceId,
                row.effectiveUsesTrunkHeight(), row.effectiveUsesDbh(), batchId);
        if (id == null) {
            throw new IllegalStateException("No se pudo obtener el ID de la especie creada");
        }
        return id;
    }

    private void updateSpecies(
            long speciesId,
            String canonicalName,
            SpeciesDraft d,
            Long typeId,
            Long originId,
            PlannedRow row,
            Long heightSourceId,
            Long crownSourceId,
            long batchId
    ) {
        jdbc.update("""
                UPDATE species
                   SET scientific_name = ?,
                       common_name = COALESCE(?, common_name),
                       family = COALESCE(?, family),
                       species_type_item_id = ?,
                       origin_item_id = ?,
                       description = COALESCE(?, description),
                        care_notes = COALESCE(?, care_notes),
                        is_critical = ?,
                       reference_height_m = ?,
                       reference_height_source_item_id = ?,
                       reference_crown_radius_m = ?,
                       reference_crown_radius_source_item_id = ?,
                       uses_trunk_height = ?,
                       uses_dbh = ?,
                       import_batch_id = ?,
                       updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?""",
                canonicalName,
                d.commonName(),
                d.family(),
                typeId,
                originId,
                d.description(),
                d.careNotes(),
                row.effectiveCritical(),
                row.effectiveHeightM(),
                heightSourceId,
                row.effectiveCrownRadiusM(),
                crownSourceId,
                row.effectiveUsesTrunkHeight(),
                row.effectiveUsesDbh(),
                batchId,
                speciesId);
    }

    private void replaceOtherNames(long speciesId, List<String> otherNames) {
        jdbc.update("""
                UPDATE species_common_names
                   SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE species_id = ? AND deleted_at IS NULL""", speciesId);
        insertOtherNames(speciesId, otherNames);
    }

    private void insertOtherNames(long speciesId, List<String> otherNames) {
        for (String name : otherNames) {
            if (name != null && !name.isBlank()) {
                jdbc.update("INSERT INTO species_common_names (species_id, name) VALUES (?, ?)",
                        speciesId, name.trim());
            }
        }
    }

}
