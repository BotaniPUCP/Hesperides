package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesRow;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpecimenRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpecimenRow;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GreenInventoryServiceImpl implements GreenInventoryService {

    private final SpeciesRepository speciesRepository;
    private final SpecimenRepository specimenRepository;

    @Override
    public InventorySummaryResponse summary() {
        long[] totals = speciesRepository.totals();
        return new InventorySummaryResponse(totals[0], totals[1], speciesRepository.typeCounts());
    }

    @Override
    public Page<SpeciesResponse> species(SpeciesQuery query) {
        List<SpeciesResponse> content = speciesRepository.page(query).stream().map(this::toResponse).toList();
        return new PageImpl<>(content, PageRequest.of(query.page(), query.size()), speciesRepository.count(query));
    }

    @Override
    public SpeciesResponse speciesBySlug(String slug) {
        return toResponse(requireSpecies(slug));
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
    public List<LocationCountResponse> locations(String speciesSlug) {
        requireSpecies(speciesSlug);
        return specimenRepository.locations(speciesSlug);
    }

    @Override
    public SpecimenDetailResponse specimenByCode(String code) {
        SpecimenRow row = specimenRepository.byCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Specimen not found: " + code));
        return new SpecimenDetailResponse(row.code(), row.sourceReference(), row.sourceLocation(), row.legacyCode(),
                row.latitude(), row.longitude(), row.photoUrl(), PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), false),
                PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), true), row.quantity(), row.notes(), row.elementTypeCode(), row.elementTypeName(), row.heightM(),
                row.trunkHeightM(), row.dbhCm(), row.crownRadiusM(), row.isBanded(), row.dataSource(),
                specimenRepository.sectionOf(code).orElse(null), speciesBySlug(row.speciesSlug()));
    }

    private SpeciesRow requireSpecies(String slug) {
        return speciesRepository.bySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
    }

    private SpeciesResponse toResponse(SpeciesRow row) {
        return new SpeciesResponse(row.slug(), row.scientificName(), row.commonName(), row.otherNames(),
                row.family(), row.typeCode(), row.typeLabel(), row.specimenCount(),
                PhotoUrls.species(row.speciesPhotoId(), row.specimenPhotoId(), row.photoUrl()));
    }

    private SpecimenResponse toResponse(SpecimenRow row) {
        return new SpecimenResponse(row.code(), row.sourceReference(), row.sourceLocation(), row.latitude(),
                row.longitude(), row.photoUrl(), PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), false),
                PhotoUrls.specimen(row.attachmentId(), row.photoUrl(), true), row.quantity(), row.notes());
    }
}
