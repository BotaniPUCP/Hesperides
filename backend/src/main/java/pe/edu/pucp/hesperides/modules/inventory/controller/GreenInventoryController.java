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
import pe.edu.pucp.hesperides.modules.inventory.dto.RetiredSpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenDetailResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.service.GreenInventoryService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

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

    /** Antes que /species/{slug}: el catálogo completo, para buscarlo y filtrarlo en el navegador (SPEC-119). */
    @GetMapping("/species/all")
    public ResponseEntity<ApiResponse<List<SpeciesResponse>>> species() {
        return ResponseEntity.ok(ApiResponse.ok("Species retrieved", service.allSpecies()));
    }

    @GetMapping("/species/{slug}")
    public ResponseEntity<ApiResponse<SpeciesResponse>> speciesBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok("Species retrieved", service.speciesBySlug(slug)));
    }

    @GetMapping("/species/{slug}/locations")
    public ResponseEntity<ApiResponse<List<LocationCountResponse>>> locations(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok("Locations retrieved", service.locations(slug)));
    }

    /** Antes que /specimens/{code}: todos los vigentes, para buscarlos y filtrarlos en el navegador (SPEC-119). */
    @GetMapping("/specimens/all")
    public ResponseEntity<ApiResponse<List<SpecimenResponse>>> allSpecimens() {
        return ResponseEntity.ok(ApiResponse.ok("Specimens retrieved", service.allSpecimens()));
    }

    @GetMapping("/locations")
    public ResponseEntity<ApiResponse<List<LocationCountResponse>>> allLocations() {
        return ResponseEntity.ok(ApiResponse.ok("Locations retrieved", service.locations(null)));
    }

    @GetMapping("/specimens/{code}")
    public ResponseEntity<ApiResponse<SpecimenDetailResponse>> specimen(
            @PathVariable String code,
            Authentication authentication) {
        boolean canViewRetired = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ADMIN".equals(a.getAuthority()) || "COORDINADOR".equals(a.getAuthority()));
        return ResponseEntity.ok(ApiResponse.ok("Specimen retrieved", service.specimenByCode(code, canViewRetired)));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
    @GetMapping("/specimens/retired")
    public ResponseEntity<ApiResponse<Page<RetiredSpecimenResponse>>> retiredSpecimens(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok("Retired specimens retrieved",
                service.retiredSpecimens(search, page, size)));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
    @GetMapping("/specimens/retired/{code}")
    public ResponseEntity<ApiResponse<RetiredSpecimenResponse>> retiredSpecimen(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Retired specimen retrieved",
                service.retiredSpecimenByCode(code)));
    }
}
