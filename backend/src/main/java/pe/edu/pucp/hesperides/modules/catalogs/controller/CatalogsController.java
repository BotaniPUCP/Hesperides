package pe.edu.pucp.hesperides.modules.catalogs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogItemResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogTypeDetailResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogTypeResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CreateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.dto.UpdateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.service.CatalogsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;
import java.util.List;

/**
 * Parsea, delega y envuelve. El typeCode va en la ruta y el code en el cuerpo:
 * el id numérico no aparece en ninguna API pública (SPEC-003 §4).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/catalogs")
public class CatalogsController {

    private static final String ADMIN_ONLY = "hasAuthority('ADMIN')";

    private final CatalogsService catalogsService;

    /**
     * El único abierto a cualquier sesión válida: lo consume todo desplegable de
     * la web y del móvil. Un operario necesita los tipos de intervención para
     * registrar su trabajo.
     */
    @GetMapping("/{typeCode}/items")
    public ResponseEntity<ApiResponse<List<CatalogItemResponse>>> activeItems(
            @PathVariable String typeCode) {
        return ResponseEntity.ok(ApiResponse.ok("Ítems obtenidos",
                catalogsService.activeItems(typeCode)));
    }

    @GetMapping
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<List<CatalogTypeResponse>>> allTypes() {
        return ResponseEntity.ok(ApiResponse.ok("Catálogos obtenidos", catalogsService.allTypes()));
    }

    @GetMapping("/{typeCode}")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CatalogTypeDetailResponse>> typeDetail(
            @PathVariable String typeCode) {
        return ResponseEntity.ok(ApiResponse.ok("Catálogo obtenido",
                catalogsService.typeDetail(typeCode)));
    }

    @PostMapping("/{typeCode}/items")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CatalogItemResponse>> createItem(
            @PathVariable String typeCode,
            @Valid @RequestBody CreateCatalogItemRequest request) {
        CatalogItemResponse created = catalogsService.createItem(typeCode, request);

        return ResponseEntity
                .created(URI.create("/api/v1/catalogs/" + typeCode + "/items/" + created.code()))
                .body(ApiResponse.ok("Ítem creado", created));
    }

    @PutMapping("/{typeCode}/items/{code}")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CatalogItemResponse>> updateItem(
            @PathVariable String typeCode,
            @PathVariable String code,
            @Valid @RequestBody UpdateCatalogItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Ítem actualizado",
                catalogsService.updateItem(typeCode, code, request)));
    }

    @PatchMapping("/{typeCode}/items/{code}/deactivate")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CatalogItemResponse>> deactivateItem(
            @PathVariable String typeCode, @PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Ítem desactivado",
                catalogsService.deactivateItem(typeCode, code)));
    }

    @PatchMapping("/{typeCode}/items/{code}/activate")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CatalogItemResponse>> activateItem(
            @PathVariable String typeCode, @PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Ítem activado",
                catalogsService.activateItem(typeCode, code)));
    }
}
