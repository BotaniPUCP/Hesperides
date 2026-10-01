package pe.edu.pucp.hesperides.modules.inventory.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.inventory.dto.InventorySummaryResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.service.GreenInventoryService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;

/**
 * Inventario verde. Sin @PreAuthorize a propósito: es de lectura pública por
 * ahora, y la excepción está declarada en SecurityConfig (README del inventario).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/green-inventory")
public class GreenInventoryController {

    private final GreenInventoryService service;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<InventorySummaryResponse>> summary() {
        return ResponseEntity.ok(ApiResponse.ok("Inventory summary retrieved", service.summary()));
    }

    @GetMapping("/species")
    public ResponseEntity<ApiResponse<Page<SpeciesResponse>>> species(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String vegetationType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        SpeciesQuery query = SpeciesQuery.of(search, vegetationType, page, size);
        return ResponseEntity.ok(ApiResponse.ok("Species retrieved", service.species(query)));
    }

    @GetMapping("/species/{slug}")
    public ResponseEntity<ApiResponse<SpeciesResponse>> speciesBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok("Species retrieved", service.speciesBySlug(slug)));
    }

    @GetMapping("/species/{slug}/specimens")
    public ResponseEntity<ApiResponse<Page<SpecimenResponse>>> specimens(
            @PathVariable String slug,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        SpecimenQuery query = SpecimenQuery.of(search, location, sort, direction, page, size);
        return ResponseEntity.ok(ApiResponse.ok("Specimens retrieved", service.specimens(slug, query)));
    }

    @GetMapping("/species/{slug}/locations")
    public ResponseEntity<ApiResponse<List<LocationCountResponse>>> locations(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok("Locations retrieved", service.locations(slug)));
    }

    @GetMapping("/specimens/{code}")
    public ResponseEntity<ApiResponse<SpecimenDetailResponse>> specimen(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Specimen retrieved", service.specimenByCode(code)));
    }
}
