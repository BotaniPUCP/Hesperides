package pe.edu.pucp.hesperides.modules.inventory.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.service.GreenInventoryService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** Authenticated options for new specimen registrations; the public catalog stays read-only. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/green-inventory/species")
public class AssignableSpeciesController {

    private final GreenInventoryService service;

    @GetMapping("/assignable")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')")
    public ResponseEntity<ApiResponse<Page<SpeciesResponse>>> assignableSpecies(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String vegetationType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        SpeciesQuery query = SpeciesQuery.of(search, vegetationType, page, size);
        return ResponseEntity.ok(ApiResponse.ok("Assignable species retrieved", service.assignableSpecies(query)));
    }
}
