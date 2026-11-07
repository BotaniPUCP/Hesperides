package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.pruning.PruningAssignment;
import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesPhotoResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenSearchResultResponse;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesRow;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpecimenRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpecimenRow;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GreenInventoryServiceImpl implements GreenInventoryService {

    private final SpeciesRepository speciesRepository;
    private final SpecimenRepository specimenRepository;
    private final SpeciesPhotoRepository speciesPhotoRepository;

    @Override
    public InventorySummaryResponse summary() {
        long[] totals = speciesRepository.totals();
        return new InventorySummaryResponse(totals[0], totals[1], speciesRepository.typeCounts());
    }

    @Override
    public Page<SpeciesResponse> species(SpeciesQuery query) {
        List<SpeciesResponse> content = speciesRepository.page(query).stream()
                .map(row -> toResponse(row, List.of())).toList();
        return new PageImpl<>(content, PageRequest.of(query.page(), query.size()), speciesRepository.count(query));
    }

    @Override
    public SpeciesResponse speciesBySlug(String slug) {
        List<SpeciesPhotoResponse> photos = speciesPhotoRepository.active(slug).stream()
                .map(p -> new SpeciesPhotoResponse(PhotoUrls.speciesPhoto(p.id(), true), PhotoUrls.speciesPhoto(p.id(), false),
                        p.author(), p.license(), p.sourcePage()))
                .toList();
        return toResponse(requireSpecies(slug), photos);
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
        SpecimenRow row = specimenRepository.byCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Specimen not found: " + code));
        boolean measured = "MEASURED".equals(row.dataSource());
        String status = PruningAssignment.measurementStatus(measured, row.speciesCritical());
        boolean reference = PruningAssignment.STATUS_REFERENCE.equals(status);
        LocalDate lastPruning = specimenRepository.lastPruningDate(code).orElse(null);
        return new SpecimenDetailResponse(row.code(), row.sourceReference(), row.sourceLocation(), row.legacyCode(),
                row.latitude(), row.longitude(), row.photoUrl(), PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), false),
                PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), true), row.quantity(), row.notes(), row.elementTypeCode(), row.elementTypeName(), row.heightM(),
                row.trunkHeightM(), row.dbhCm(), row.crownRadiusM(), row.isBanded(), row.dataSource(),
                specimenRepository.sectionOf(code).orElse(null), speciesBySlug(row.speciesSlug()), row.measuredAt(),
                row.speciesCritical(), status, reference ? row.referenceHeightM() : null,
                reference ? row.referenceCrownRadiusM() : null, reference ? row.referenceHeightSourceName() : null,
                reference ? row.referenceCrownRadiusSourceName() : null, lastPruning,
                measuredBeforePruning(measured, row.measuredAt(), lastPruning),
                PruningAssignment.propose(row.speciesCritical(), measured, row.heightM()));
    }

    /** Una poda del mismo día no invalida la medida: pudo tomarse justo después. */
    private static boolean measuredBeforePruning(boolean measured, LocalDate measuredAt, LocalDate lastPruning) {
        return measured && measuredAt != null && lastPruning != null && lastPruning.isAfter(measuredAt);
    }

    @Override
    public List<SpecimenSearchResultResponse> searchSpecimens(String query, int limit) {
        return specimenRepository.search(query, limit);
    }

    private SpeciesRow requireSpecies(String slug) {
        return speciesRepository.bySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
    }

    private SpeciesResponse toResponse(SpeciesRow row, List<SpeciesPhotoResponse> photos) {
        return new SpeciesResponse(row.slug(), row.scientificName(), row.commonName(), row.otherNames(),
                row.family(), row.typeCode(), row.typeLabel(), row.originCode(), row.originLabel(),
                row.description(), row.careNotes(), row.specimenCount(),
                PhotoUrls.species(row.speciesPhotoId(), row.specimenPhotoId(), row.photoUrl()),
                PhotoUrls.speciesSource(row.speciesPhotoId(), row.specimenPhotoId(), row.photoUrl()), photos,
                row.critical(), row.referenceHeightM(), row.referenceHeightSourceCode(), row.referenceHeightSourceName(),
                row.referenceCrownRadiusM(), row.referenceCrownRadiusSourceCode(), row.referenceCrownRadiusSourceName(),
                row.usesTrunkHeight(), row.usesDbh(), row.unmeasuredSpecimenCount());
    }

    private SpecimenResponse toResponse(SpecimenRow row) {
        return new SpecimenResponse(row.code(), row.sourceReference(), row.sourceLocation(), row.latitude(),
                row.longitude(), row.photoUrl(), PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), false),
                PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), true), row.quantity(), row.notes(),
                row.speciesSlug(), row.speciesCommonName(), row.speciesScientificName());
    }
}
