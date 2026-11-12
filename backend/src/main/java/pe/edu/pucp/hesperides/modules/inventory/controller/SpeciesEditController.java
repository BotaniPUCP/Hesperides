package pe.edu.pucp.hesperides.modules.inventory.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesForm;
import pe.edu.pucp.hesperides.modules.inventory.dto.DeactivationRequest;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.modules.inventory.service.SpeciesEditService;
import pe.edu.pucp.hesperides.modules.inventory.service.SpeciesLifecycleService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** Corrección de una especie del catálogo. Su foto conserva su propio endpoint. */
@RestController
@RequiredArgsConstructor
public class SpeciesEditController {

    private final SpeciesEditService service;
    private final SpeciesLifecycleService lifecycle;

    @PutMapping("/api/v1/green-inventory/species/{slug}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')")
    public ResponseEntity<ApiResponse<SpeciesResponse>> update(
            @PathVariable String slug, @Valid @RequestBody SpeciesForm form,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Species updated",
                service.update(slug, form, ManagerAuthority.isManager(principal))));
    }

    @PatchMapping("/api/v1/green-inventory/species/{slug}/deactivate")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
    public ResponseEntity<ApiResponse<Void>> deactivate(
            @PathVariable String slug, @Valid @RequestBody DeactivationRequest request) {
        lifecycle.deactivate(slug, request.reason());
        return ResponseEntity.ok(ApiResponse.ok("Species deactivated", null));
    }
}
