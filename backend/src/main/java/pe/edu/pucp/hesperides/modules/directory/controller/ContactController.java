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
import pe.edu.pucp.hesperides.modules.directory.dto.ContactRequest;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactDetail;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactSummary;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.Page;
import pe.edu.pucp.hesperides.modules.directory.dto.LinkRequest;
import pe.edu.pucp.hesperides.modules.directory.dto.RoleRequest;
import pe.edu.pucp.hesperides.modules.directory.service.ContactQueryService;
import pe.edu.pucp.hesperides.modules.directory.service.ContactService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** Contactos del Directorio: personas de una o más organizaciones. */
@RestController
@RequestMapping("/api/v1/directory/contacts")
@PreAuthorize(DirectoryAccess.READERS)
@RequiredArgsConstructor
public class ContactController {

    private final ContactService service;
    private final ContactQueryService queries;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ContactSummary>>> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) String organizationCode,
            @RequestParam(defaultValue = "false") boolean withoutOrganization,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        DirectoryAccess.checkPage(page, size);
        return ResponseEntity.ok(ApiResponse.ok("Contacts",
                queries.list(q, organizationCode, withoutOrganization, page, size)));
    }

    @GetMapping("/similar")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<List<ContactSummary>>> similar(@RequestParam String fullName) {
        return ResponseEntity.ok(ApiResponse.ok("Similar contacts", queries.similar(fullName)));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<ContactDetail>> detail(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Contact", queries.detail(code)));
    }

    @PostMapping
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Map<String, String>>> create(@Valid @RequestBody ContactRequest request) {
        String code = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Contact created", Map.of("code", code)));
    }

    @PutMapping("/{code}")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> update(@PathVariable String code, @Valid @RequestBody ContactRequest request) {
        service.update(code, request);
        return ResponseEntity.ok(ApiResponse.ok("Contact updated", null));
    }

    @PostMapping("/{code}/organizations")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> link(@PathVariable String code, @Valid @RequestBody LinkRequest request) {
        service.link(code, request.organizationCode(), request.role());
        return ResponseEntity.ok(ApiResponse.ok("Contact linked", null));
    }

    /** Cambia solo el rol del vínculo; no toca el vínculo ni los datos (SPEC-106 §4.3). */
    @PutMapping("/{code}/organizations/{organizationCode}")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> updateLinkRole(@PathVariable String code,
            @PathVariable String organizationCode, @RequestBody RoleRequest request) {
        service.updateLinkRole(code, organizationCode, request == null ? null : request.role());
        return ResponseEntity.ok(ApiResponse.ok("Contact link role updated", null));
    }

    @DeleteMapping("/{code}")
    @PreAuthorize(DirectoryAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable String code) {
        service.deactivate(code);
        return ResponseEntity.ok(ApiResponse.ok("Contact deactivated", null));
    }
}
