package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.pruning.PruningAssignment;
import pe.edu.pucp.hesperides.modules.inventory.dto.ExtraMeasureResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.RetiredSpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesPhotoResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenSearchResultResponse;
import pe.edu.pucp.hesperides.modules.inventory.repository.ExtraMeasureRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesRow;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpecimenRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpecimenRow;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GreenInventoryServiceImpl implements GreenInventoryService {

    private final SpeciesRepository speciesRepository;
    private final SpecimenRepository specimenRepository;
    private final SpeciesPhotoRepository speciesPhotoRepository;
    private final ExtraMeasureRepository extraMeasures;

    @Override
    public InventorySummaryResponse summary() {
        long[] totals = speciesRepository.totals();
        return new InventorySummaryResponse(totals[0], totals[1], speciesRepository.typeCounts());
    }

    @Override
    public Page<SpeciesResponse> species(SpeciesQuery query) {
        List<SpeciesResponse> content = speciesRepository.page(query).stream()
                .map(row -> toResponse(row, List.of(), List.of())).toList();
        return new PageImpl<>(content, PageRequest.of(query.page(), query.size()), speciesRepository.count(query));
    }

    @Override
    public Page<SpeciesResponse> assignableSpecies(SpeciesQuery query) {
        List<SpeciesResponse> content = speciesRepository.assignable(query).stream()
                .map(row -> toResponse(row, List.of(), List.of())).toList();
        return new PageImpl<>(content, PageRequest.of(query.page(), query.size()), speciesRepository.countAssignable(query));
    }

    @Override
    public SpeciesResponse speciesBySlug(String slug) {
        return speciesBySlug(slug, false);
    }

    private SpeciesResponse speciesBySlug(String slug, boolean includeDeleted) {
        List<SpeciesPhotoResponse> photos = speciesPhotoRepository.active(slug).stream()
                .map(p -> new SpeciesPhotoResponse(PhotoUrls.speciesPhoto(p.id(), true), PhotoUrls.speciesPhoto(p.id(), false),
                        p.author(), p.license(), p.sourcePage()))
                .toList();
        SpeciesRow row = (includeDeleted ? speciesRepository.bySlugIncludeDeleted(slug) : speciesRepository.bySlug(slug))
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
        return toResponse(row, photos, extraMeasures.ofSpecies(slug));
    }

    @Override
    public Page<SpecimenResponse> specimens(String speciesSlug, SpecimenQuery query) {
        requireSpecies(speciesSlug);
        List<SpecimenResponse> content = specimenRepository.page(speciesSlug, query).stream()
                .map(this::toResponse).toList();
        return new PageImpl<>(content, PageRequest.of(query.page(), query.size()),
                specimenRepository.count(speciesSlug, query));
    }

    @Override
    public Page<SpecimenResponse> allSpecimens(SpecimenQuery query) {
        List<SpecimenResponse> content = specimenRepository.page(null, query).stream()
                .map(this::toResponse).toList();
        return new PageImpl<>(content, PageRequest.of(query.page(), query.size()),
                specimenRepository.count(null, query));
    }

    @Override
    public List<LocationCountResponse> locations(String speciesSlug) {
        if (speciesSlug != null) {
            requireSpecies(speciesSlug);
        }
        return specimenRepository.locations(speciesSlug);
    }

    @Override
    public SpecimenDetailResponse specimenByCode(String code) {
        return specimenByCode(code, false);
    }

    @Override
    public SpecimenDetailResponse specimenByCode(String code, boolean canViewRetired) {
        Optional<SpecimenRow> active = specimenRepository.byCode(code);
        if (active.isPresent()) {
            return toDetailResponse(active.get(), true, null, null, null);
        }

        if (!canViewRetired) {
            throw new ResourceNotFoundException("Specimen not found: " + code);
        }

        SpecimenRow retiredRow = specimenRepository.retiredSpecimenRowByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Specimen not found: " + code));
        RetiredSpecimenResponse retiredMeta = specimenRepository.retiredByCode(code).orElse(null);
        Instant retiredAt = retiredMeta != null ? retiredMeta.retiredAt() : null;
        String reason = retiredMeta != null ? retiredMeta.reason() : null;
        String retiredByName = retiredMeta != null ? retiredMeta.retiredByName() : null;

        return toDetailResponse(retiredRow, false, retiredAt, reason, retiredByName);
    }

    private SpecimenDetailResponse toDetailResponse(SpecimenRow row, boolean isActive, Instant retiredAt,
                                                    String retirementReason, String retiredByName) {
        boolean measured = "MEASURED".equals(row.dataSource());
        String status = PruningAssignment.measurementStatus(measured, row.speciesCritical());
        boolean reference = PruningAssignment.STATUS_REFERENCE.equals(status);
        LocalDate lastPruning = specimenRepository.lastPruningDate(row.id()).orElse(null);
        return new SpecimenDetailResponse(row.id(), row.code(), row.sourceReference(), row.sourceLocation(), row.legacyCode(),
                row.latitude(), row.longitude(), row.photoUrl(), PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), false),
                PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), true), row.quantity(), row.notes(), row.elementTypeCode(), row.elementTypeName(), row.heightM(),
                row.trunkHeightM(), row.dbhCm(), row.crownRadiusM(), row.isBanded(), row.dataSource(),
                specimenRepository.sectionOf(row.code()).orElse(null), speciesBySlug(row.speciesSlug(), !isActive), row.measuredAt(),
                row.speciesCritical(), status, reference ? row.referenceHeightM() : null,
                reference ? row.referenceCrownRadiusM() : null, reference ? row.referenceHeightSourceName() : null,
                reference ? row.referenceCrownRadiusSourceName() : null, lastPruning,
                measuredBeforePruning(measured, row.measuredAt(), lastPruning),
                PruningAssignment.propose(row.speciesCritical(), measured, row.heightM()),
                extraMeasures.latestOfSpecimen(row.code()),
                isActive, retiredAt, retirementReason, retiredByName);
    }

    /** Una poda del mismo día no invalida la medida: pudo tomarse justo después. */
    private static boolean measuredBeforePruning(boolean measured, LocalDate measuredAt, LocalDate lastPruning) {
        return measured && measuredAt != null && lastPruning != null && lastPruning.isAfter(measuredAt);
    }

    @Override
    public List<SpecimenSearchResultResponse> searchSpecimens(String query, int limit) {
        return specimenRepository.search(query, limit);
    }

    @Override
    public Page<RetiredSpecimenResponse> retiredSpecimens(String search, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        List<RetiredSpecimenResponse> content = specimenRepository.retiredPage(search, safePage, safeSize);
        long total = specimenRepository.retiredCount(search);
        return new PageImpl<>(content, PageRequest.of(safePage, safeSize), total);
    }

    @Override
    public RetiredSpecimenResponse retiredSpecimenByCode(String code) {
        return specimenRepository.retiredByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Retired specimen not found: " + code));
    }

    private SpeciesRow requireSpecies(String slug) {
        return speciesRepository.bySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
    }

    private SpeciesResponse toResponse(SpeciesRow row, List<SpeciesPhotoResponse> photos,
                                       List<ExtraMeasureResponse> measures) {
        return new SpeciesResponse(row.slug(), row.active(), row.scientificName(), row.commonName(), row.otherNames(),
                row.family(), row.typeCode(), row.typeLabel(), row.originCode(), row.originLabel(),
                row.description(), row.careNotes(), row.specimenCount(),
                PhotoUrls.species(row.speciesPhotoId(), row.specimenPhotoId(), row.photoUrl()),
                PhotoUrls.speciesSource(row.speciesPhotoId(), row.specimenPhotoId(), row.photoUrl()), photos,
                row.critical(), row.referenceHeightM(), row.referenceHeightSourceCode(), row.referenceHeightSourceName(),
                row.referenceCrownRadiusM(), row.referenceCrownRadiusSourceCode(), row.referenceCrownRadiusSourceName(),
                row.usesTrunkHeight(), row.usesDbh(), row.unmeasuredSpecimenCount(), measures);
    }

    private SpecimenResponse toResponse(SpecimenRow row) {
        return new SpecimenResponse(row.code(), row.sourceReference(), row.sourceLocation(), row.latitude(),
                row.longitude(), row.photoUrl(), PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), false),
                PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), true), row.quantity(), row.notes(),
                row.speciesSlug(), row.speciesCommonName(), row.speciesScientificName());
    }
}
