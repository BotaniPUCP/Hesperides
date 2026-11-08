package pe.edu.pucp.hesperides.modules.directory.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationDetail;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSuggestion;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSummary;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.Page;
import pe.edu.pucp.hesperides.modules.directory.dto.OrganizationRequest;
import pe.edu.pucp.hesperides.modules.directory.service.OrganizationQueryService;
import pe.edu.pucp.hesperides.modules.directory.service.OrganizationService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** Organizaciones del Directorio: unidades PUCP y empresas externas. */
@RestController
@RequestMapping("/api/v1/directory/organizations")
@PreAuthorize(DirectoryAccess.READERS)
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService service;
    private final OrganizationQueryService queries;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrganizationSummary>>> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) String typeCode, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        DirectoryAccess.checkPage(page, size);
        return ResponseEntity.ok(ApiResponse.ok("Organizations", queries.list(q, typeCode, page, size)));
    }

    /** Antes que /{code}: «similar» no es un código. Solo lo usa quien puede crear. */
    @GetMapping("/similar")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<List<OrganizationSuggestion>>> similar(@RequestParam String name) {
        return ResponseEntity.ok(ApiResponse.ok("Similar organizations", queries.similar(name)));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<OrganizationDetail>> detail(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Organization", queries.detail(code)));
    }

    @PostMapping
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Map<String, String>>> create(@Valid @RequestBody OrganizationRequest request) {
        String code = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Organization created", Map.of("code", code)));
    }

    @PutMapping("/{code}")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> update(@PathVariable String code,
            @Valid @RequestBody OrganizationRequest request) {
        service.update(code, request);
        return ResponseEntity.ok(ApiResponse.ok("Organization updated", null));
    }

    @DeleteMapping("/{code}")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable String code) {
        service.deactivate(code);
        return ResponseEntity.ok(ApiResponse.ok("Organization deactivated", null));
    }
}
