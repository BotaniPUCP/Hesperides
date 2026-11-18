package pe.edu.pucp.hesperides.modules.inventory.service;

import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;

import java.util.List;

/** Consulta del inventario verde: especies del catastro y sus ejemplares. */
public interface GreenInventoryService {

    InventorySummaryResponse summary();

    /** Activas y en proceso de retiro, para buscarlas y filtrarlas en el navegador (SPEC-119). */
    List<SpeciesResponse> allSpecies();

    SpeciesResponse speciesBySlug(String slug);

    /** Todos los vigentes; la ficha de una especie los filtra por su slug en el navegador (SPEC-119). */
    List<SpecimenResponse> allSpecimens();

    List<LocationCountResponse> locations(String speciesSlug);

    SpecimenDetailResponse specimenByCode(String code);
}
