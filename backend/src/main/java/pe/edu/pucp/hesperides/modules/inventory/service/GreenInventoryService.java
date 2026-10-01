package pe.edu.pucp.hesperides.modules.inventory.service;

import org.springframework.data.domain.Page;
import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;

import java.util.List;

/** Consulta del inventario verde: especies del catastro y sus ejemplares. */
public interface GreenInventoryService {

    InventorySummaryResponse summary();

    Page<SpeciesResponse> species(SpeciesQuery query);

    SpeciesResponse speciesBySlug(String slug);

    Page<SpecimenResponse> specimens(String speciesSlug, SpecimenQuery query);

    List<LocationCountResponse> locations(String speciesSlug);

    SpecimenDetailResponse specimenByCode(String code);
}
