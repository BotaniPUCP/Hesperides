package pe.edu.pucp.hesperides.modules.catalogs.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogItemResponse;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogTypesRepository;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;

/**
 * Endpoint de consumo de catálogos configurable (SPEC-003 §4): lista los ítems
 * de un tipo para poblar desplegables. Lo usa el frontend para el select de
 * rol del alta de usuarios (SPEC-100 §5.1, useCatalog('ROLE')). Sin paginación:
 * un catalog_type es, por diseño, una lista corta.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/catalogs")
public class CatalogController {

    private final CatalogItemsRepository catalogItemsRepository;
    private final CatalogTypesRepository catalogTypesRepository;

    @GetMapping("/{typeCode}/items")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<CatalogItemResponse>>> list(
            @PathVariable String typeCode,
            @RequestParam(value = "includeInactive", defaultValue = "false") boolean includeInactive,
            @AuthenticationPrincipal UserDetails principal) {

        if (!catalogTypesRepository.existsByCodeAndDeletedAtIsNull(typeCode)) {
            throw new ResourceNotFoundException("Catalog type not found");
        }

        // SPEC-003 §4: includeInactive solo se honra para ADMIN; para cualquier
        // otro rol se ignora y se fuerza false.
        boolean seeInactive = includeInactive && hasAuthority(principal, "ADMIN");

        List<CatalogItemResponse> items = (seeInactive
                ? catalogItemsRepository.findByCatalogTypeCodeAndDeletedAtIsNullOrderBySortOrderAsc(typeCode)
                : catalogItemsRepository.findActiveByTypeCode(typeCode))
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Catalog items retrieved successfully", items));
    }

    private CatalogItemResponse toResponse(CatalogItem item) {
        return new CatalogItemResponse(item.getId(), item.getCode(), item.getLabel(), item.getSortOrder(), null);
    }

    private boolean hasAuthority(UserDetails principal, String authority) {
        return principal.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals(authority));
    }
}