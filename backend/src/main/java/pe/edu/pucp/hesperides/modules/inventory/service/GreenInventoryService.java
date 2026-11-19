package pe.edu.pucp.hesperides.modules.inventory.service;

import org.springframework.data.domain.Page;
import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.RetiredSpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenSearchResultResponse;

import java.util.List;

/** Consulta del inventario verde: especies del catastro y sus ejemplares. */
public interface GreenInventoryService {

    InventorySummaryResponse summary();

    Page<SpeciesResponse> species(SpeciesQuery query);

    Page<SpeciesResponse> assignableSpecies(SpeciesQuery query);

    SpeciesResponse speciesBySlug(String slug);

    Page<SpecimenResponse> specimens(String speciesSlug, SpecimenQuery query);

    Page<SpecimenResponse> allSpecimens(SpecimenQuery query);

    List<LocationCountResponse> locations(String speciesSlug);

    default SpecimenDetailResponse specimenByCode(String code) {
        return specimenByCode(code, false);
    }

    SpecimenDetailResponse specimenByCode(String code, boolean canViewRetired);

    List<SpecimenSearchResultResponse> searchSpecimens(String query, int limit);

    Page<RetiredSpecimenResponse> retiredSpecimens(String search, int page, int size);

    RetiredSpecimenResponse retiredSpecimenByCode(String code);
}
