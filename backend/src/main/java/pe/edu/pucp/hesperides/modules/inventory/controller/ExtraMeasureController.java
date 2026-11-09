package pe.edu.pucp.hesperides.modules.inventory.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.inventory.dto.ExtraMeasureForm;
import pe.edu.pucp.hesperides.modules.inventory.dto.ExtraMeasureResponse;
import pe.edu.pucp.hesperides.modules.inventory.service.ExtraMeasureCatalogService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;

/** El catálogo de medidas adicionales. Solo ADMIN y COORDINADOR lo amplían, para evitar duplicados. */
@RestController
@RequestMapping("/api/v1/green-inventory/extra-measures")
@RequiredArgsConstructor
public class ExtraMeasureController {

    private final ExtraMeasureCatalogService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ExtraMeasureResponse>>> active() {
        return ResponseEntity.ok(ApiResponse.ok("Extra measures", service.active()));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
    public ResponseEntity<ApiResponse<ExtraMeasureResponse>> create(@Valid @RequestBody ExtraMeasureForm form) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Extra measure created", service.create(form)));
    }
}
