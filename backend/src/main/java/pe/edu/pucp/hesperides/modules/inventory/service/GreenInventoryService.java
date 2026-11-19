package pe.edu.pucp.hesperides.modules.inventory.service;

import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.RetiredSpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;

import org.springframework.data.domain.Page;

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

    /** Un retirado solo lo ve quien puede consultar retirados (ADMIN y COORDINADOR). */
    SpecimenDetailResponse specimenByCode(String code, boolean canViewRetired);

    Page<RetiredSpecimenResponse> retiredSpecimens(String search, int page, int size);

    RetiredSpecimenResponse retiredSpecimenByCode(String code);
}
